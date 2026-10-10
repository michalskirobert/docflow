export type MobileEditorNavDetail = {
  active: boolean;
  kind?: "template" | "document" | "email";
  name?: string;
  pending?: boolean;
  primaryLabel?: string;
  primaryIcon?: "save" | "generate" | "send";
  backLabel?: string;
  primaryTitle?: string;
  primaryDisabled?: boolean;
  metadataDisabled?: boolean;
  actions?: { id: string; label: string; disabled?: boolean }[];
};

export const MOBILE_EDITOR_NAV_STATE = "docflow:mobile-editor-nav-state";
export const MOBILE_EDITOR_NAV_SAVE = "docflow:mobile-editor-nav-save";
export const MOBILE_EDITOR_NAV_BACK = "docflow:mobile-editor-nav-back";
export const MOBILE_EDITOR_NAV_ACTION = "docflow:mobile-editor-nav-action";
export const MOBILE_EDITOR_NAV_EDIT_META =
  "docflow:mobile-editor-nav-edit-meta";

export function publishMobileEditorNav(detail: MobileEditorNavDetail) {
  window.dispatchEvent(
    new CustomEvent<MobileEditorNavDetail>(MOBILE_EDITOR_NAV_STATE, { detail }),
  );
}
