import { Link } from 'react-router-dom';

export function Logo() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2 font-heading text-xl font-bold"
      aria-label="Brightloop home"
    >
      <svg
        viewBox="0 0 32 32"
        className="size-8"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="16"
          cy="16"
          r="11"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <circle cx="24" cy="8" r="4" className="fill-accent" />
      </svg>
      brightloop
    </Link>
  );
}
