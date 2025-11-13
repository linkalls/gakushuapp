import { NextPage } from "next";
import Link from "next/link";

const PrivacyPolicyPage: NextPage = () => {
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
            <h1>Privacy Policy</h1>
            <p className="lead">
              Your privacy is important to us. It is GakushuApp's policy to
              respect your privacy regarding any information we may collect from
              you across our website.
            </p>

            <h2>1. Information we collect</h2>
            <p>
              We only ask for personal information when we truly need it to
              provide a service to you. We collect it by fair and lawful means,
              with your knowledge and consent. We also let you know why we’re
              collecting it and how it will be used.
            </p>

            <h3>Log data</h3>
            <p>
              When you visit our website, our servers may automatically log the
              standard data provided by your web browser. This data is considered
              “non-identifying information,” as it does not personally identify
              you on its own. It may include your computer’s Internet Protocol
              (IP) address, your browser type and version, the pages you visit,
              the time and date of your visit, the time spent on each page, and
              other details.
            </p>

            <h3>Personal information</h3>
            <p>
              We may ask for personal information, such as your:
            </p>
            <ul>
              <li>Name</li>
              <li>Email</li>
              <li>Payment information</li>
            </ul>
            <p>
              This data is considered “identifying information,” as it can
              personally identify you. We only request this information to provide
              you with our services.
            </p>

            <h2>2. How we use your information</h2>
            <p>
              We use the information we collect to provide, maintain, and improve
              our services. We will not use or share your information with anyone
              except as described in this Privacy Policy.
            </p>

            <h2>3. Security</h2>
            <p>
              We take security seriously. We have put in place suitable physical,
              electronic and managerial procedures to safeguard and secure the
              information and protect it from misuse, interference, loss and
              unauthorized access, modification and disclosure.
            </p>

            <h2>4. Third-Party Services</h2>
            <p>
              We may use third-party services for analytics, payment processing,
              and other business purposes. These services may have their own
              privacy policies. We use Stripe for payment processing. Please review
              their privacy policy.
            </p>

            <h2>5. Changes to our Privacy Policy</h2>
            <p>
              We reserve the right to change this privacy policy at any time. We
              will notify you of any changes by posting the new privacy policy on
              this page.
            </p>

            <h2>Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact
              us at:{" "}
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
            <Link href="/tokusho" className="hover:underline">
              特定商取引法に基づく表記
            </Link>
          </div>
          <p className="mt-4">&copy; {new Date().getFullYear()} GakushuApp. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicyPage;
