import { ListingPageSkeleton } from "@/components/skeletons";
import { APP_NAME } from "@/lib/app-name";

export default function Loading() {
  return <ListingPageSkeleton srLabel={`${APP_NAME} is loading`} />;
}
