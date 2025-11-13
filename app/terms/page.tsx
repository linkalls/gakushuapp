import { NextPage } from "next";
import Link from "next/link";

const TermsOfServicePage: NextPage = () => {
  return (
    <div className="bg-white dark:bg-zinc-950 min-h-screen flex flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              href="/"
              className="text-xl font-bold text-zinc-900 dark:text-zinc-100"
            >
              GakushuApp
            </Link>
          </div>
        </div>
      </header>
      <main className="grow">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <article className="prose dark:prose-invert prose-lg prose-h1:text-4xl prose-h2:text-3xl mx-auto">
            <h1>Terms of Service</h1>
            <p className="lead">
              Please read these Terms of Service ("Terms", "Terms of Service")
              carefully before using the GakushuApp website (the "Service")
              operated by us.
            </p>

            <h2>1. Agreement to Terms</h2>
            <p>
              By using our Service, you agree to be bound by these Terms. If you
              disagree with any part of the terms, then you may not access the
              Service.
            </p>

            <h2>2. Accounts</h2>
            <p>
              When you create an account with us, you must provide us with
              information that is accurate, complete, and current at all times.
              Failure to do so constitutes a breach of the Terms, which may
              result in immediate termination of your account on our Service.
            </p>

            <h2>3. Intellectual Property</h2>
            <p>
              The Service and its original content, features, and functionality
              are and will remain the exclusive property of GakushuApp and its
              licensors.
            </p>

            <h2>4. Links To Other Web Sites</h2>
            <p>
              Our Service may contain links to third-party web sites or services
              that are not owned or controlled by GakushuApp.
            </p>
            <p>
              GakushuApp has no control over, and assumes no responsibility for,
              the content, privacy policies, or practices of any third party web
              sites or services. You further acknowledge and agree that
              GakushuApp shall not be responsible or liable, directly or
              indirectly, for any damage or loss caused or alleged to be caused
              by or in connection with use of or reliance on any such content,
              goods or services available on or through any such web sites or
              services.
            </p>

            <h2>5. Termination</h2>
            <p>
              We may terminate or suspend your account immediately, without prior
              notice or liability, for any reason whatsoever, including without
              limitation if you breach the Terms.
            </p>

            <h2>6. Governing Law</h2>
            <p>
              These Terms shall be governed and construed in accordance with the
              laws of Japan, without regard to its conflict of law provisions.
            </p>

            <h2>7. Changes</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace
              these Terms at any time. What constitutes a material change will be
              determined at our sole discretion.
            </p>

            <h2>Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at:{" "}
              <a href="mailto:gakushukun@gmail.com">
                gakushukun@gmail.com
              </a>
              .
            </p>
          </article>
        </div>
      </main>
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <div className="flex justify-center space-x-4">
            <Link href="/terms" className="hover:underline">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
          </div>
          <p className="mt-4">&copy; {new Date().getFullYear()} GakushuApp. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default TermsOfServicePage;
