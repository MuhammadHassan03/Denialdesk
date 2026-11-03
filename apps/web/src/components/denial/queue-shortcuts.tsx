"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const ROW_SELECTOR = "[data-queue-row]";
const SEARCH_INPUT_ID = "queue-search";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable
  );
}

function focusRow(step: number): void {
  const rows = Array.from(document.querySelectorAll<HTMLElement>(ROW_SELECTOR));
  if (rows.length === 0) {
    return;
  }
  const currentIndex = rows.findIndex((row) => row === document.activeElement);
  let nextIndex = currentIndex + step;
  if (currentIndex === -1) {
    nextIndex = 0;
  }
  const nextRow = rows[Math.min(Math.max(nextIndex, 0), rows.length - 1)];
  nextRow?.focus();
}

// Queue keys (F4): j and k move between rows, Enter opens one, / jumps to search.
// Clicking anywhere on a row opens it too.
export function QueueShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) {
        return;
      }
      if (event.key === "j") {
        event.preventDefault();
        focusRow(1);
        return;
      }
      if (event.key === "k") {
        event.preventDefault();
        focusRow(-1);
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        document.getElementById(SEARCH_INPUT_ID)?.focus();
        return;
      }
      const focusedRow = document.activeElement;
      if (
        event.key === "Enter" &&
        focusedRow instanceof HTMLElement &&
        focusedRow.matches(ROW_SELECTOR)
      ) {
        const href = focusedRow.dataset.href;
        if (href !== undefined) {
          router.push(href);
        }
      }
    }

    function handleClick(event: MouseEvent) {
      if (!(event.target instanceof Element) || event.target.closest("a, button") !== null) {
        return;
      }
      const clickedRow = event.target.closest<HTMLElement>(ROW_SELECTOR);
      const href = clickedRow?.dataset.href;
      if (href !== undefined) {
        router.push(href);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClick);
    };
  }, [router]);

  return null;
}
