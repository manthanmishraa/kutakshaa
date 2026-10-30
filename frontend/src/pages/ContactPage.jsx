import { useState } from 'react';

const CONTACT_EMAIL = 'hello@kutaksha.com';

const initialForm = {
  name: '',
  email: '',
  organization: '',
  message: '',
};

export default function ContactPage() {
  const [form, setForm] = useState(initialForm);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const subject = encodeURIComponent(`Kutaksha enquiry from ${form.name || 'a prospective partner'}`);
    const body = encodeURIComponent(
      [
        `Name: ${form.name}`,
        `Email: ${form.email}`,
        `Organization: ${form.organization || 'N/A'}`,
        '',
        'Enquiry:',
        form.message,
      ].join('\n')
    );

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 xl:px-10">
      <section className="grid gap-4 lg:grid-cols-12">
        <article className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:col-span-7 md:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Contact</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">Bring preventive monitoring to your care ecosystem</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            Talk with us about pilots, eldercare center partnerships, hospital integration, and deployment strategy.
          </p>
          <p className="mt-3 text-sm font-medium text-slate-700">
            Email us at <a className="text-teal-700 underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>

          <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
              placeholder="Full Name"
            />
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
              placeholder="Email"
            />
            <input
              name="organization"
              value={form.organization}
              onChange={handleChange}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500 md:col-span-2"
              placeholder="Organization"
            />
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              required
              className="min-h-28 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500 md:col-span-2"
              placeholder="What are you looking to implement?"
            />
            <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 md:col-span-2">
              Send Inquiry
            </button>
          </form>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 lg:col-span-5">
          SIH 2K26 prototype. Non-diagnostic preventive intelligence for eldercare.
        </article>
      </section>
    </div>
  );
}
