import Link from "next/link";
import {
  WaterDropIcon,
  FactoryIcon,
  DepotIcon,
  TruckIcon,
  BottleIcon,
  ReportIcon,
} from "@/components/icons/EntityIcons";

const features = [
  {
    icon: WaterDropIcon,
    title: "100% Pure & Safe",
    desc: "Nigerian-standard sachet and bottle water, purified and quality-checked at every batch.",
  },
  {
    icon: FactoryIcon,
    title: "Smart Factories",
    desc: "Track production, batches and machine output across every plant in real time.",
  },
  {
    icon: DepotIcon,
    title: "Connected Depots",
    desc: "Know exactly what each depot holds with live stock levels and low-stock alerts.",
  },
  {
    icon: TruckIcon,
    title: "Reliable Distribution",
    desc: "Dispatch trucks, manage transfers and follow every delivery from plant to point.",
  },
  {
    icon: BottleIcon,
    title: "Products That Sell",
    desc: "Manage sachet and bottle SKUs, pricing and fast point-of-sale at every location.",
  },
  {
    icon: ReportIcon,
    title: "Clear Reports",
    desc: "See sales, costs, profit and wastage at a glance with simple, honest numbers.",
  },
];

const stats = [
  { value: "100%", label: "Pure Drinking Water" },
  { value: "24/7", label: "Production Monitoring" },
  { value: "1000+", label: "Daily Deliveries" },
  { value: "99.9%", label: "On-time Supply" },
];

export default function HomeLanding() {
  return (
    <div className="min-h-screen bg-white font-outfit text-gray-900">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white">
              <WaterDropIcon className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight">
              Verri<span className="text-brand-500">P</span> Water
            </span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Features
            </a>
            <a href="#how" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              How it works
            </a>
            <a href="#stats" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Why us
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/signin"
              className="hidden text-sm font-semibold text-gray-700 hover:text-brand-500 sm:block"
            >
              Login
            </Link>
            <Link
              href="/signin"
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 to-white" />
        <div
          className="absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl"
          aria-hidden
        />
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-20 text-center sm:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
            <WaterDropIcon className="h-3.5 w-3.5" />
            Pure. Safe. Delivered.
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Verri P Water —{" "}
            <span className="text-brand-500">100% Pure &amp; Safe</span> drinking water, every time.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-gray-600 sm:text-lg">
            From our factories to your doorstep. We produce, store and deliver premium sachet and
            bottle water across Nigeria with smart, reliable operations you can trust.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signin"
              className="w-full rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 sm:w-auto"
            >
              Access operations
            </Link>
            <a
              href="#features"
              className="w-full rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300 sm:w-auto"
            >
              See how it works
            </a>
          </div>

          {/* Product mock card */}
          <div className="mx-auto mt-16 max-w-4xl rounded-2xl border border-gray-100 bg-white p-3 shadow-xl shadow-gray-200/50">
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-error-400" />
                <span className="h-3 w-3 rounded-full bg-warning-400" />
                <span className="h-3 w-3 rounded-full bg-success-400" />
              </div>
              <div className="text-xs font-medium text-gray-400">verrip.com.ng</div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl bg-brand-50 p-4 text-left">
                  <div className="text-xl font-bold text-brand-600">{s.value}</div>
                  <div className="mt-1 text-[11px] font-medium text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section id="stats" className="border-y border-gray-100 bg-gray-50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-10 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-extrabold text-gray-900">{s.value}</div>
              <div className="mt-1 text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Everything to keep water flowing
          </h2>
          <p className="mt-4 text-gray-600">
            One simple system to run your production, stock and deliveries — built for Verri P Water.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gray-100 bg-white p-6 transition hover:border-brand-200 hover:shadow-lg hover:shadow-brand-100/40"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                <f.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">How it works</h2>
            <p className="mt-4 text-gray-600">Three simple steps from source to sip.</p>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Produce",
                desc: "Record production at each factory. Stock updates automatically, batch by batch.",
              },
              {
                step: "02",
                title: "Store & Transfer",
                desc: "Move water to depots and trucks with clear transfers and live stock levels.",
              },
              {
                step: "03",
                title: "Sell & Deliver",
                desc: "Capture sales and payments at every point, and keep customers happy.",
              },
            ].map((item) => (
              <div key={item.step} className="relative rounded-2xl bg-white p-7 shadow-sm">
                <span className="text-4xl font-extrabold text-brand-100">{item.step}</span>
                <h3 className="mt-3 text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="overflow-hidden rounded-3xl bg-brand-500 px-8 py-14 text-center sm:px-16">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Ready for pure, simple operations?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-brand-50">
            Log in to the Verri P Water operations console and keep every drop accounted for.
          </p>
          <Link
            href="/signin"
            className="mt-8 inline-block rounded-xl bg-white px-7 py-3 text-sm font-semibold text-brand-600 shadow-sm transition hover:bg-brand-50"
          >
            Go to console
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
              <WaterDropIcon className="h-4 w-4" />
            </span>
            <span className="font-bold">
              Verri<span className="text-brand-500">P</span> Water Inc
            </span>
          </div>
          <p className="text-sm text-gray-500">
            100% Pure &amp; Safe Drinking Water &bull; Nigeria
          </p>
          <div className="flex items-center gap-5 text-sm text-gray-500">
            <a href="#" className="hover:text-brand-500">
              Privacy
            </a>
            <a href="#" className="hover:text-brand-500">
              Terms
            </a>
            <a href="mailto:support@verrip.com.ng" className="hover:text-brand-500">
              support@verrip.com.ng
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
