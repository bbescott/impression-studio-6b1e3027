import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function Privacy() {
  useEffect(() => {
    const title = "Privacy Policy | Impression Studio";
    document.title = title;

    const desc =
      "Read the Impression Studio privacy policy covering data collection, use, retention, and your rights.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${window.location.origin}/privacy`);

    const scriptId = "jsonld-privacy";
    const existing = document.getElementById(scriptId);
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Privacy Policy - Impression Studio",
      url: `${window.location.origin}/privacy`,
      description: desc,
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = scriptId;
    script.text = JSON.stringify(jsonLd);
    if (existing) {
      existing.replaceWith(script);
    } else {
      document.head.appendChild(script);
    }
  }, []);

  const today = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="min-h-screen bg-background">
      <section className="container mx-auto px-4 py-16 max-w-3xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-display font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2">Last updated: {today}</p>
        </header>

        <article className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold">Introduction</h2>
            <p className="text-muted-foreground">
              Impression Studio ("we", "us", "our") is committed to protecting your privacy. This
              policy explains what information we collect, how we use it, and your rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Information We Collect</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Account data: email, LinkedIn profile details (when you choose LinkedIn sign-in).</li>
              <li>Usage data: app interactions, settings you configure, and technical logs.</li>
              <li>Content you provide: interview titles, notes, and recordings you choose to create.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">How We Use Information</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>To provide and improve the app experience and features.</li>
              <li>To authenticate users and secure access.</li>
              <li>To communicate updates, respond to support, and ensure reliability.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Legal Bases</h2>
            <p className="text-muted-foreground">
              Where applicable, we process data based on consent, contract necessity, and legitimate
              interests such as security and service improvement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Sharing & Transfers</h2>
            <p className="text-muted-foreground">
              We do not sell personal data. We may share data with service providers (e.g., Supabase,
              ElevenLabs) to operate the app, under appropriate safeguards.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Data Retention</h2>
            <p className="text-muted-foreground">
              We retain data only as long as necessary for the purposes described or as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Your Rights</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Access, correct, or delete your personal data.</li>
              <li>Withdraw consent where processing is based on consent.</li>
              <li>Object to or restrict certain processing.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Cookies</h2>
            <p className="text-muted-foreground">
              We use essential cookies for authentication and functionality. You can control cookies in
              your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Security</h2>
            <p className="text-muted-foreground">
              We implement technical and organizational measures to protect your data. No method is 100%
              secure, but we strive for industry-standard practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Children's Privacy</h2>
            <p className="text-muted-foreground">
              Our service is not directed to children under 13, and we do not knowingly collect their data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this policy periodically. We will update the date above when changes are made.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Contact</h2>
            <p className="text-muted-foreground">
              Questions? Contact us via the app or support channels. We will respond promptly.
            </p>
          </section>
        </article>

        <footer className="text-center mt-10 text-sm">
          <Link to="/" className="underline underline-offset-4 hover:text-foreground">
            Back to home
          </Link>
        </footer>
      </section>
    </main>
  );
}
