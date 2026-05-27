'use client';

import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Radix-backed dropdown menu primitive in PanelCraft's slate/violet theme.
 * Mirrors the structure of `dialog.tsx` — re-exports Radix parts as
 * named components and supplies the `Content`/`Item` chrome.
 *
 * Use for action menus where a button reveals a small list of choices —
 * e.g. the editor footer's "Composition Actions" trigger which collapses
 * Cover regen / Compose / View into one button on narrow viewports.
 *
 * @example
 * <DropdownMenu>
 *   <DropdownMenuTrigger asChild>
 *     <Button size="sm">Actions</Button>
 *   </DropdownMenuTrigger>
 *   <DropdownMenuContent align="end">
 *     <DropdownMenuItem onSelect={...}>Regenerate</DropdownMenuItem>
 *     <DropdownMenuItem onSelect={...}>View</DropdownMenuItem>
 *   </DropdownMenuContent>
 * </DropdownMenu>
 */
/**
 * Default `modal={false}` to bypass `react-remove-scroll`. See `dialog.tsx`
 * for the full rationale — same lifecycle bug, same fix.
 */
const DropdownMenu = ({
  modal = false,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root>) => (
  <DropdownMenuPrimitive.Root modal={modal} {...props} />
);
DropdownMenu.displayName = 'DropdownMenu';
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

/**
 * Trigger row that opens a nested submenu when activated.
 * Wraps Radix `DropdownMenuPrimitive.SubTrigger` and renders a trailing
 * chevron to indicate it expands.
 *
 * @component
 * @param props - Radix SubTrigger props plus `inset` to add an 8-unit
 *   left padding so the row aligns with checkbox/radio items in the
 *   same menu.
 * @param ref - Forwarded reference to the underlying Radix SubTrigger.
 * @returns React.Element trigger row that opens a submenu on activation.
 */
const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-slate-800 data-[state=open]:bg-slate-800',
      inset && 'pl-8',
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName;

/**
 * Floating panel that holds the contents of a nested submenu.
 * Wraps Radix `DropdownMenuPrimitive.SubContent` with PanelCraft's
 * slate surface, border, and shadow.
 *
 * @component
 * @param props - Radix SubContent props (e.g. `sideOffset`, `align`).
 * @param ref - Forwarded reference to the underlying Radix SubContent.
 * @returns React.Element floating panel for the submenu items.
 */
const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      'z-50 min-w-[8rem] overflow-hidden rounded-md border border-slate-700 bg-slate-900 p-1 text-slate-100 shadow-lg',
      className
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName;

/**
 * Main floating panel that holds the dropdown's items.
 * Wraps Radix `DropdownMenuPrimitive.Content` in a `Portal` so it
 * escapes the trigger's stacking context.
 *
 * @component
 * @param props - Radix Content props. `sideOffset` defaults to 4px so
 *   the menu sits just below the trigger; `align` controls horizontal
 *   alignment relative to the trigger.
 * @param ref - Forwarded reference to the underlying Radix Content.
 * @returns React.Element portaled dropdown panel.
 */
const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[10rem] overflow-hidden rounded-md border border-slate-700 bg-slate-900 p-1 text-slate-100 shadow-xl',
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

/**
 * Selectable row inside a dropdown menu.
 * Wraps Radix `DropdownMenuPrimitive.Item`; consumers wire behavior
 * through `onSelect`.
 *
 * @component
 * @param props - Radix Item props plus `inset` to add an 8-unit left
 *   padding so the row aligns with checkbox/radio items in the same
 *   menu.
 * @param ref - Forwarded reference to the underlying Radix Item.
 * @returns React.Element interactive menu row.
 */
const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none transition-colors focus:bg-slate-800 focus:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

/**
 * Menu row with a leading check indicator that toggles on selection.
 * Wraps Radix `DropdownMenuPrimitive.CheckboxItem`.
 *
 * @component
 * @param props - Radix CheckboxItem props. `checked` is the current
 *   toggle state (boolean or Radix' `'indeterminate'`); `onCheckedChange`
 *   reports user toggles.
 * @param ref - Forwarded reference to the underlying Radix CheckboxItem.
 * @returns React.Element checkbox row with a left-aligned check icon.
 */
const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-slate-800 focus:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName;

/**
 * Non-interactive section heading rendered above grouped items.
 * Wraps Radix `DropdownMenuPrimitive.Label` with an uppercase, muted
 * caption style.
 *
 * @component
 * @param props - Radix Label props plus `inset` to add an 8-unit left
 *   padding so the heading aligns with checkbox/radio items below.
 * @param ref - Forwarded reference to the underlying Radix Label.
 * @returns React.Element labelled heading inside a dropdown menu.
 */
const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      'px-2 py-1.5 text-[10px] uppercase tracking-widest text-slate-500',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

/**
 * Thin horizontal rule that visually separates groups of items.
 * Wraps Radix `DropdownMenuPrimitive.Separator`.
 *
 * @component
 * @param props - Radix Separator props.
 * @param ref - Forwarded reference to the underlying Radix Separator.
 * @returns React.Element 1-pixel divider row.
 */
const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-slate-700', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
