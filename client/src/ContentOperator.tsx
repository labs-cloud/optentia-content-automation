import { useEffect, useRef } from "react";
import "./co/style.css";
// The prototype ships as verbatim HTML + vanilla JS so the implementation is a
// byte-for-byte clone of the approved design. We mount the markup once and run
// the original script at global scope (its inline handlers, e.g. the deck's
// "Generate 5 more" button, call top-level functions).
import bodyHtml from "./co/body.html?raw";
import scriptJs from "./co/script.js?raw";

/**
 * Content Operator — the approved "Frosted Vapor" design, rendered exactly.
 * Frosted-glass panels over a drifting aurora, a floating dock, and three
 * screens (Home, Brainstorm, Content Queue) with a light/dark twin (Opal).
 */
export default function ContentOperator() {
  const hostRef = useRef<HTMLDivElement>(null);
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    // The design lives on <body data-theme><body data-nav>; the script swaps
    // these, but set the committed defaults up front to avoid a first-paint flash.
    document.body.setAttribute("data-theme", "vapor");
    document.body.setAttribute("data-nav", "dock");

    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = bodyHtml;

    const script = document.createElement("script");
    script.textContent = scriptJs;
    document.body.appendChild(script);
  }, []);

  return <div ref={hostRef} />;
}
