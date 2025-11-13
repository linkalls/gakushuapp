import crypto from "crypto";
import fs from "fs";
import OpenAI from "openai";
import { zodResponseFormat, zodTextFormat } from "openai/helpers/zod";
import sharp from "sharp";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GeneratedCard {
  front: string;
  back: string;
}

export type CardType = "qa" | "true-false" | "detailed";

export interface GenerationOptions {
  customPrompt?: string;
  cardType?: CardType;
}

// Zodスキーマでカードの構造を定義
const cardSchema = z.object({
  front: z.string().describe("カードの表面（質問）"),
  back: z.string().describe("カードの裏面（答え）"),
});

const cardsResponseSchema = z.object({
  cards: z.array(cardSchema).describe("生成されたフラッシュカードの配列"),
});

function getCardTypeInstructions(cardType: CardType): string {
  switch (cardType) {
    case "qa":
      return "各カードは簡潔な「一問一答」形式にしてください。質問は明確で、答えは端的に。";
    case "true-false":
      return "各カードは「正誤問題」形式にしてください。表面に陳述文を、裏面に正解(○/×)と簡単な解説を記載。";
    case "detailed":
      return "各カードは「詳細な解説」形式にしてください。質問と、理解を深める詳しい答えを記載。";
    default:
      return "各カードは「質問」と「答え」の形式にしてください。";
  }
}

/**
 * テキストからカードを生成
 */
export async function generateCardsFromText(
  text: string,
  count: number = 10,
  options?: GenerationOptions
): Promise<GeneratedCard[]> {
  const cardType = options?.cardType || "detailed";
  const typeInstructions = getCardTypeInstructions(cardType);

  const basePrompt = `以下のテキストから、学習に適した${count}枚のフラッシュカードを生成してください。
${typeInstructions}
重要な概念、用語、事実を抽出し、効果的に記憶できるような質問を作成してください。`;

  const customInstructions = options?.customPrompt
    ? `\n\n追加の指示:\n${options.customPrompt}`
    : "";

  const prompt = `${basePrompt}${customInstructions}\n\nテキスト:\n${text}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: zodResponseFormat(cardsResponseSchema, "cards"),
    temperature: 0.7,
  });

  const message = response.choices[0].message;

  // リクエストが拒否された場合
  if (message.refusal) {
    throw new Error(`リクエストが拒否されました: ${message.refusal}`);
  }

  // パース結果を取得
  const content = message.content;
  if (!content) {
    throw new Error("AIからの応答がありませんでした");
  }

  const parsed = JSON.parse(content);
  return parsed.cards || [];
}

/**
 * PDFからカードを生成(OpenAI APIに直接PDFを渡す)
 */
export async function generateCardsFromPDF(
  pdfBuffer: File,
  count: number = 10,
  options?: GenerationOptions
): Promise<GeneratedCard[]> {
  let tmpFile: string | undefined;
  let pdfPath: string | undefined;

  try {
    console.log("[AI-PDF] Starting PDF processing...");
    console.log("[AI-PDF] File name:", pdfBuffer.name);
    console.log("[AI-PDF] File size:", pdfBuffer.size);
    console.log("[AI-PDF] File type:", pdfBuffer.type);

    const cardType = options?.cardType || "detailed";
    const typeInstructions = getCardTypeInstructions(cardType);

    const basePrompt = `このPDFを分析し、学習に適した${count}枚のフラッシュカードを生成してください。
${typeInstructions}
PDFに含まれる情報(テキスト、図、グラフなど)から、重要な内容を抽出してください。`;

    const customInstructions = options?.customPrompt
      ? `\n\n追加の指示:\n${options.customPrompt}`
      : "";

    const prompt = `${basePrompt}${customInstructions}`;

    // Create temp directory and file
    console.log("[AI-PDF] Creating temp directory...");
    tmpFile = await fs.promises.mkdtemp("/tmp/pdf-");
    pdfPath = `${tmpFile}/${crypto.randomUUID()}.pdf`;
    console.log("[AI-PDF] Temp path:", pdfPath);

    // Convert File to Buffer and save
    console.log("[AI-PDF] Converting file to buffer...");
    const arrayBuffer = await pdfBuffer.arrayBuffer();
    await fs.promises.writeFile(pdfPath, Buffer.from(arrayBuffer));
    console.log("[AI-PDF] File saved successfully");

    // Upload to OpenAI
    console.log("[AI-PDF] Uploading file to OpenAI...");
    const file = await openai.files.create({
      file: fs.createReadStream(pdfPath),
      purpose: "user_data",
    });
    console.log("[AI-PDF] File uploaded, ID:", file.id);

    // Call OpenAI API
    console.log("[AI-PDF] Calling OpenAI API...");
    const response = await openai.responses.parse({
      model: "gpt-5-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              file_id: file.id,
            },
            {
              type: "input_text",
              text: prompt,
            },
          ],
        },
      ],
      text: {
        format: zodTextFormat(cardsResponseSchema, "cards"),
      },
    });
    console.log("[AI-PDF] OpenAI API call completed");

    // Parse response
    const output = response.output_parsed?.cards;
    console.log("[AI-PDF] Generated cards count:", output?.length || 0);

    // Cleanup temp file
    if (pdfPath && tmpFile) {
      try {
        await fs.promises.unlink(pdfPath);
        await fs.promises.rmdir(tmpFile);
        console.log("[AI-PDF] Temp file cleaned up");
      } catch (cleanupError) {
        console.error("[AI-PDF] Cleanup error:", cleanupError);
      }
    }

    return output || [];
  } catch (error) {
    // Cleanup on error
    if (pdfPath && tmpFile) {
      try {
        await fs.promises.unlink(pdfPath);
        await fs.promises.rmdir(tmpFile);
      } catch (cleanupError) {
        console.error("[AI-PDF] Cleanup error:", cleanupError);
      }
    }

    console.error("[AI-PDF] Error occurred:", error);
    console.error(
      "[AI-PDF] Error stack:",
      error instanceof Error ? error.stack : "N/A"
    );

    throw new Error(
      `PDF処理エラー: ${
        error instanceof Error ? error.message : "不明なエラー"
      }`
    );
  }
}

/**
 */
export async function generateCardsFromImage(
  imageBuffer: Buffer,
  count: number = 10
): Promise<GeneratedCard[]> {
  try {
    // 画像を最適化（サイズを小さくする）
    const optimizedImage = await sharp(imageBuffer)
      .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64Image = optimizedImage.toString("base64");

    const prompt = `この画像を分析し、学習に適した${count}枚のフラッシュカードを生成してください。
画像に含まれる情報（図、グラフ、テキスト、概念など）から、重要な内容を抽出して質問と答えの形式にしてください。`;

    const response = await openai.responses.parse({
      model: "gpt-5-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
      text: {
        format: zodTextFormat(cardsResponseSchema, "cards"),
      },
    });

    const message = response.output_parsed;

    return message?.cards || [];
  } catch (error) {
    throw new Error(
      `画像処理エラー: ${
        error instanceof Error ? error.message : "不明なエラー"
      }`
    );
  }
}

/**
 * AI使用制限をチェック（サブスクリプションベース）
 * Free: 月10回, Lite: 月50回, Pro: 月100回
 */
export function checkAIUsageLimit(
  plan: string,
  usageCount: number,
  resetAt: number
): { allowed: boolean; remaining: number; limit: number } {
  const limits: Record<string, number> = {
    free: 10,
    lite: 50,
    pro: 100,
  };

  const limit = limits[plan] || limits.free;
  const now = Date.now();
  const oneMonth = 30 * 24 * 60 * 60 * 1000;

  // リセット期間が過ぎていたらリセット
  if (now - resetAt > oneMonth) {
    return { allowed: true, remaining: limit, limit };
  }

  const remaining = limit - usageCount;

  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    limit,
  };
}
