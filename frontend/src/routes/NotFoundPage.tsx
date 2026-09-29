import { Compass } from "lucide-react";
import { Link } from "react-router";

import styles from "./NotFoundPage.module.css";

export function NotFoundPage() {
  return (
    <div className={styles.wrap}>
      <span className={styles.mark} aria-hidden="true">
        ℞
      </span>
      <h1>Page not found</h1>
      <p>This page doesn&apos;t exist — maybe it was never prescribed.</p>
      <Link to="/dashboard" className={styles.homeLink}>
        <Compass size={16} /> Back to dashboard
      </Link>
    </div>
  );
}
