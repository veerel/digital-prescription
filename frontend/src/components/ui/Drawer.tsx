import { X } from "lucide-react";
import { type ReactNode, useId } from "react";

import styles from "./Drawer.module.css";
import { useEscape } from "./useEscape";

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 460,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const titleId = useId();
  useEscape(open, onClose);
  if (!open) return null;

  return (
    <div className={[styles.overlay, styles.overlayOpen].join(" ")} onMouseDown={onClose}>
      <div
        className={[styles.drawer, styles.drawerOpen].join(" ")}
        style={{ width }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.header}>
          <div>
            <h3 className={styles.title} id={titleId}>
              {title}
            </h3>
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close panel">
            <X size={18} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </div>
  );
}
