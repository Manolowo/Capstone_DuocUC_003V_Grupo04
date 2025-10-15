import React from "react";

export default function ModuleShell({ title, desc, children, right }) {
  return (
    <>
      <header className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {desc && <p className="text-sm text-slate-500">{desc}</p>}
        </div>
        {right}
      </header>
      <div className="rounded-3xl border bg-white p-4">{children}</div>
    </>
  );
}
