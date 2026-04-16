import React, { useState } from "react";

const SESSION_KEY = "vt_authed";
const EXPECTED = import.meta.env.VITE_APP_PASSWORD as string;

function isSessionAuthed(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

interface Props {
  children: React.ReactNode;
}

export default function PasswordGate({ children }: Props) {
  const [authed, setAuthed] = useState(isSessionAuthed);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  if (authed) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === EXPECTED) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
    } else {
      setError(true);
      setInput("");
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-100 via-fuchsia-50 to-pink-100">
      <div className={`bg-white rounded-3xl shadow-2xl p-10 w-full max-w-sm text-center${shaking ? " [animation:shake_0.4s_ease-in-out]" : ""}`}>
        <div className="text-5xl mb-3">&#127958;&#65039;</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Team Vacation Tracker</h1>
        <p className="text-sm text-gray-500 mb-8">Enter the team password to get started</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false); }}
            placeholder="Password"
            autoFocus
            className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-colors focus:border-fuchsia-400 ${error ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"}`}
          />
          {error && <p className="text-red-500 text-xs -mt-1">Incorrect password. Try again.</p>}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white font-semibold text-sm shadow-md hover:shadow-lg hover:from-fuchsia-600 hover:to-violet-600 transition-all duration-200 active:scale-95"
          >
            Sign in
          </button>
        </form>
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`}</style>
    </div>
  );
}
