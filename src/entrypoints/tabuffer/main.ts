import { webExtensionAdapter } from "../../browser/webextension";
import { Controller } from "../../ui/controller";
import { Renderer } from "../../ui/renderer";

const renderer = new Renderer(
  required("rows"),
  required("summary"),
  required("status"),
  required<HTMLInputElement>("search-input"),
);

void new Controller(webExtensionAdapter, renderer).start().catch(console.error);

function required<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element as T;
}
