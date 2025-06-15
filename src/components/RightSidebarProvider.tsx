
import * as React from "react"
import { PanelRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent } from "@/components/ui/sheet"

const SIDEBAR_COOKIE_NAME = "right-sidebar:state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"

type RightSidebarContext = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const RightSidebarContext = React.createContext<RightSidebarContext | null>(null)

function useRightSidebar() {
  const context = React.useContext(RightSidebarContext)
  if (!context) {
    throw new Error("useRightSidebar must be used within a RightSidebarProvider.")
  }
  return context
}

const RightSidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }
>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile()
    const [openMobile, setOpenMobile] = React.useState(false)

    const [_open, _setOpen] = React.useState(defaultOpen)
    const open = openProp ?? _open
    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(open) : value
        if (setOpenProp) {
          setOpenProp(openState)
        } else {
          _setOpen(openState)
        }

        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
      },
      [setOpenProp, open]
    )

    const toggleSidebar = React.useCallback(() => {
      return isMobile
        ? setOpenMobile((open) => !open)
        : setOpen((open) => !open)
    }, [isMobile, setOpen, setOpenMobile])

    const state = open ? "expanded" : "collapsed"

    const contextValue = React.useMemo<RightSidebarContext>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
    )

    return (
      <RightSidebarContext.Provider value={contextValue}>
        <div
          style={
            {
              "--right-sidebar-width": SIDEBAR_WIDTH,
              ...style,
            } as React.CSSProperties
          }
          className={cn("group/right-sidebar-wrapper", className)}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      </RightSidebarContext.Provider>
    )
  }
)
RightSidebarProvider.displayName = "RightSidebarProvider"

const RightSidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    variant?: "sidebar" | "floating" | "inset"
    collapsible?: "offcanvas" | "icon" | "none"
  }
>(
  (
    {
      variant = "sidebar",
      collapsible = "offcanvas",
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { isMobile, state, openMobile, setOpenMobile } = useRightSidebar()

    if (collapsible === "none") {
      return (
        <div
          className={cn(
            "flex h-full w-[--right-sidebar-width] flex-col bg-sidebar text-sidebar-foreground",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      )
    }

    if (isMobile) {
      return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
          <SheetContent
            data-sidebar="right-sidebar"
            data-mobile="true"
            className="w-[--right-sidebar-width] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
            style={
              {
                "--right-sidebar-width": SIDEBAR_WIDTH_MOBILE,
              } as React.CSSProperties
            }
            side="right"
          >
            <div className="flex h-full w-full flex-col">{children}</div>
          </SheetContent>
        </Sheet>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          "group peer-right hidden md:block text-sidebar-foreground transition-[width] duration-200 ease-linear",
          state === "collapsed" && collapsible === "offcanvas" ? "w-0" : "w-[--right-sidebar-width]",
          "h-full bg-sidebar border-l border-sidebar-border",
          className
        )}
        data-state={state}
        data-collapsible={state === "collapsed" ? collapsible : ""}
        data-variant={variant}
        data-side="right"
        {...props}
      >
        <div className="flex h-full w-full flex-col">
          {children}
        </div>
      </div>
    )
  }
)
RightSidebar.displayName = "RightSidebar"

const RightSidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useRightSidebar()

  return (
    <Button
      ref={ref}
      data-sidebar="right-trigger"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelRight />
      <span className="sr-only">Toggle Right Sidebar</span>
    </Button>
  )
})
RightSidebarTrigger.displayName = "RightSidebarTrigger"

export {
  RightSidebarProvider,
  RightSidebar,
  RightSidebarTrigger,
  useRightSidebar,
}
