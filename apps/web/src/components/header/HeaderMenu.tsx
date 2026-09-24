"use client";

import { type ReactNode, useId } from "react";

import { classNames } from "@/lib/class-names";

import styles from "./header.module.css";
import { useDropdown } from "./use-dropdown";

interface HeaderMenuProps {
  // The button's accessible name: "Account menu", "Menu".
  readonly label: string;
  readonly trigger: ReactNode;
  readonly children: ReactNode;
  readonly testId: string;
  readonly className?: string | undefined;
}

// A disclosure, not an ARIA menu: the panel holds ordinary links and a sign-out form,
// reached with Tab like any other link. The children are rendered by the server
// (SessionBar), so the member's links and role checks never ship as client code.
export function HeaderMenu({
  label,
  trigger,
  children,
  testId,
  className,
}: HeaderMenuProps) {
  const { open, toggle, closeOnLinkClick, rootRef, triggerRef } = useDropdown();
  const panelId = useId();
  return (
    <div ref={rootRef} className={classNames(styles.dropdown, className)}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.menuButton}
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        data-testid={testId}
        onClick={toggle}
      >
        {trigger}
      </button>
      <div
        id={panelId}
        className={styles.panel}
        hidden={!open}
        data-testid={`${testId}-panel`}
        onClick={closeOnLinkClick}
      >
        {children}
      </div>
    </div>
  );
}
