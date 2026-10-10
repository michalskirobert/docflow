import { AppLoader } from "@/components/ui/app-loader";

// Fallback for the initial locale route load. Login and register retain their
// more specific, layout-matched loading.tsx skeletons during navigation.
export default function LocaleLoading() {
  return <AppLoader />;
}
