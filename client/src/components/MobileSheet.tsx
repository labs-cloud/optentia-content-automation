import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";

/**
 * iOS-style bottom action sheet (vaul drawer). Use for mobile quick actions
 * and detail views; on desktop prefer Dialog.
 */
export function MobileSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh]">
        {(title || description) && (
          <DrawerHeader className="text-left">
            {title && <DrawerTitle className="font-display">{title}</DrawerTitle>}
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
        )}
        <div className="px-4 pb-6 overflow-y-auto">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
