import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { ShopSortControl } from "../../styles/shop/ShopSortMenu.styles";

const SORT_OPTIONS = [
  { value: "name,asc", label: "이름순" },
  { value: "price,asc", label: "낮은 가격순" },
  { value: "price,desc", label: "높은 가격순" },
] as const;

export default function ShopSortMenu({
  value,
  onChange,
}: {
  value: string;
  onChange: (sort: string) => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const selectedIndex = Math.max(
    0,
    SORT_OPTIONS.findIndex((option) => option.value === value),
  );
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [position, setPosition] = useState({ above: false, maxHeight: 208 });
  const listId = `${id}-list`;
  const optionId = (index: number) => `${id}-option-${index}`;

  useLayoutEffect(() => {
    if (!open) return;
    function measure() {
      const bounds = trigger.current?.getBoundingClientRect();
      if (!bounds) return;
      const below = window.innerHeight - bounds.bottom - 12;
      const above = bounds.top - 12;
      const showAbove = below < 160 && above > below;
      setPosition({
        above: showAbove,
        maxHeight: Math.max(44, Math.min(208, showAbove ? above : below)),
      });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false);
    };
    const closeOnWindowBlur = () => setOpen(false);
    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("blur", closeOnWindowBlur);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("blur", closeOnWindowBlur);
    };
  }, [open]);

  useEffect(() => {
    const menu = list.current;
    const option = menu?.children[activeIndex] as HTMLElement | undefined;
    if (!open || !menu || !option) return;
    // Scroll only the popup; keyboard navigation must not move the shop page.
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < menu.scrollTop) menu.scrollTop = top;
    else if (bottom > menu.scrollTop + menu.clientHeight) {
      menu.scrollTop = bottom - menu.clientHeight;
    }
  }, [open, activeIndex]);

  function showMenu(index = selectedIndex) {
    setActiveIndex(index);
    setOpen(true);
  }

  function choose(index: number, restoreFocus = true) {
    const option = SORT_OPTIONS[index];
    setOpen(false);
    if (option.value !== value) onChange(option.value);
    if (restoreFocus) trigger.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (
      event.nativeEvent.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        if (!open) showMenu();
        else
          setActiveIndex((index) =>
            Math.max(
              0,
              Math.min(
                SORT_OPTIONS.length - 1,
                index + (event.key === "ArrowDown" ? 1 : -1),
              ),
            ),
          );
        break;
      case "Home":
      case "End":
        event.preventDefault();
        showMenu(event.key === "Home" ? 0 : SORT_OPTIONS.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (!event.repeat) {
          if (open) choose(activeIndex);
          else showMenu();
        }
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }
        break;
      case "Tab":
        if (open) choose(activeIndex, false);
        break;
      default: {
        if (event.key.length !== 1) break;
        const index = SORT_OPTIONS.findIndex((option) =>
          option.label.startsWith(event.key),
        );
        if (index >= 0) {
          event.preventDefault();
          showMenu(index);
        }
      }
    }
  }

  return (
    <ShopSortControl
      ref={root}
      onBlur={(event) => {
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          setOpen(false);
      }}
    >
      <label id={`${id}-label`} htmlFor={`${id}-trigger`}>
        정렬
      </label>
      <button
        ref={trigger}
        id={`${id}-trigger`}
        type="button"
        role="combobox"
        className="shop-sort-trigger"
        aria-labelledby={`${id}-label ${id}-value`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? optionId(activeIndex) : undefined}
        onClick={() => (open ? setOpen(false) : showMenu())}
        onKeyDown={handleKeyDown}
      >
        <span id={`${id}-value`}>{SORT_OPTIONS[selectedIndex].label}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <ul
          ref={list}
          id={listId}
          className="shop-sort-options"
          role="listbox"
          aria-labelledby={`${id}-label`}
          data-side={position.above ? "top" : "bottom"}
          style={
            { "--sort-menu-height": `${position.maxHeight}px` } as CSSProperties
          }
          onMouseDown={(event) => event.preventDefault()}
        >
          {SORT_OPTIONS.map((option, index) => (
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={value === option.value}
              data-active={activeIndex === index}
              onPointerMove={(event) => {
                if (event.pointerType !== "touch" && activeIndex !== index)
                  setActiveIndex(index);
              }}
              onClick={() => choose(index)}
            >
              <span>{option.label}</span>
              {value === option.value && <Check size={16} aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </ShopSortControl>
  );
}
