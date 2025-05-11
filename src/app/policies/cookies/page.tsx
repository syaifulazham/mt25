import React from 'react';
import { Metadata } from 'next';
import { Separator } from '@/components/ui/separator';

export const metadata: Metadata = {
  title: 'Cookie Policy | Techlympics 2025',
  description: 'Learn how Techlympics 2025 uses cookies to improve your experience.',
};

export default function CookiePolicyPage() {
  return (
    <div className="container py-12 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cookie Policy</h1>
          <p className="text-muted-foreground mt-2">
            Last updated: May 12, 2025
          </p>
        </div>
        <Separator />

        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-2xl font-bold">1. Introduction</h2>
            <p>
              The Techlympics 2025 website ("we", "our", or "us") uses cookies and similar technologies to enhance your browsing experience, analyze site traffic, and personalize content. This Cookie Policy explains how we use these technologies, what types of cookies we use, and your choices regarding their use.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">2. What Are Cookies?</h2>
            <p>
              Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They are widely used to make websites work more efficiently, provide a better user experience, and give website owners information about how visitors use their site.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">3. Types of Cookies We Use</h2>
            <p>We use the following categories of cookies on the Techlympics 2025 website:</p>
            
            <div className="ml-4 space-y-4">
              <div>
                <h3 className="text-xl font-semibold">3.1 Essential Cookies</h3>
                <p className="mt-1">
                  These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and account access. You cannot opt out of these cookies as the website cannot function properly without them.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold">3.2 Functionality Cookies</h3>
                <p className="mt-1">
                  These cookies enhance the functionality of our website by storing your preferences. They may be set by us or by third-party providers whose services we have added to our pages. If you disable these cookies, some or all of these services may not function properly.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold">3.3 Analytics Cookies</h3>
                <p className="mt-1">
                  These cookies collect information about how visitors use our website, including which pages visitors go to most often and if they receive error messages. We use this information to improve our website and your experience. All information these cookies collect is aggregated and anonymous.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold">3.4 Session State Cookies</h3>
                <p className="mt-1">
                  These cookies store information about your session to enhance your experience on our platform. They are used to maintain your login status, remember your preferences, and ensure a seamless experience when navigating between pages.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">4. Specific Cookies Used</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border rounded-md">
                <thead className="bg-muted">
                  <tr>
                    <th className="border p-2 text-left">Cookie Name</th>
                    <th className="border p-2 text-left">Purpose</th>
                    <th className="border p-2 text-left">Duration</th>
                    <th className="border p-2 text-left">Type</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-2">next-auth.session-token</td>
                    <td className="border p-2">Used to maintain user authentication sessions</td>
                    <td className="border p-2">Session</td>
                    <td className="border p-2">Essential</td>
                  </tr>
                  <tr>
                    <td className="border p-2">next-auth.csrf-token</td>
                    <td className="border p-2">Protects against Cross-Site Request Forgery attacks</td>
                    <td className="border p-2">Session</td>
                    <td className="border p-2">Essential</td>
                  </tr>
                  <tr>
                    <td className="border p-2">next-auth.callback-url</td>
                    <td className="border p-2">Manages authentication redirects</td>
                    <td className="border p-2">Session</td>
                    <td className="border p-2">Essential</td>
                  </tr>
                  <tr>
                    <td className="border p-2">techlympics-lang</td>
                    <td className="border p-2">Remembers your language preference</td>
                    <td className="border p-2">1 year</td>
                    <td className="border p-2">Functionality</td>
                  </tr>
                  <tr>
                    <td className="border p-2">techlympics-cookie-consent</td>
                    <td className="border p-2">Records your cookie consent choices</td>
                    <td className="border p-2">1 year</td>
                    <td className="border p-2">Essential</td>
                  </tr>
                  <tr>
                    <td className="border p-2">_ga</td>
                    <td className="border p-2">Google Analytics - Tracks user behavior</td>
                    <td className="border p-2">2 years</td>
                    <td className="border p-2">Analytics</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">5. How to Manage Cookies</h2>
            <p>
              Most web browsers allow you to control cookies through their settings preferences. However, if you limit the ability of websites to set cookies, you may impair your overall user experience, as it will no longer be personalized to you.
            </p>
            <p>
              To find out more about cookies, including how to see what cookies have been set and how to manage and delete them, visit <a href="https://www.allaboutcookies.org" className="text-primary underline" target="_blank" rel="noopener noreferrer">www.allaboutcookies.org</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">6. Changes to This Cookie Policy</h2>
            <p>
              We may update this Cookie Policy from time to time to reflect changes in technology, regulation, or our business practices. Any changes will be posted on this page with an updated revision date. Please check back periodically to stay informed about our use of cookies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">7. Contact Us</h2>
            <p>
              If you have any questions about our use of cookies or this Cookie Policy, please contact us at:
            </p>
            <p>
              Email: privacy@techlympics2025.my
            </p>
            <p>
              Address: Ministry of Science, Technology and Innovation (MOSTI)<br />
              Level 1-7, Block C4 & C5, Complex C<br />
              Federal Government Administrative Centre<br />
              62662 Putrajaya, Malaysia
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
