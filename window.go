package main

import (
	"log"
	"runtime"
	"syscall"
	"unsafe"

	"github.com/wailsapp/go-webview2/pkg/edge"
	"golang.org/x/sys/windows"
)

var (
	ole32              = windows.NewLazySystemDLL("ole32")
	procCoInitializeEx = ole32.NewProc("CoInitializeEx")

	kernel32             = windows.NewLazySystemDLL("kernel32")
	procGetModuleHandleW = kernel32.NewProc("GetModuleHandleW")

	user32                = windows.NewLazySystemDLL("user32")
	procDefWindowProcW    = user32.NewProc("DefWindowProcW")
	procRegisterClassExW  = user32.NewProc("RegisterClassExW")
	procCreateWindowExW   = user32.NewProc("CreateWindowExW")
	procShowWindow        = user32.NewProc("ShowWindow")
	procUpdateWindow      = user32.NewProc("UpdateWindow")
	procGetMessageW       = user32.NewProc("GetMessageW")
	procTranslateMessage  = user32.NewProc("TranslateMessage")
	procDispatchMessageW  = user32.NewProc("DispatchMessageW")
	procPostQuitMessage   = user32.NewProc("PostQuitMessage")
	procAdjustWindowRect  = user32.NewProc("AdjustWindowRect")
	procGetSystemMetrics  = user32.NewProc("GetSystemMetrics")

	className = syscall.StringToUTF16Ptr("MusteriDefteriWndClass")

	globalChromium *edge.Chromium
)

type wndClassEx struct {
	cbSize        uint32
	style         uint32
	lpfnWndProc   uintptr
	cbClsExtra    int32
	cbWndExtra    int32
	hInstance     windows.Handle
	hIcon         windows.Handle
	hCursor       windows.Handle
	hbrBackground windows.Handle
	lpszMenuName  *uint16
	lpszClassName *uint16
	hIconSm       windows.Handle
}

type rect struct {
	left   int32
	top    int32
	right  int32
	bottom int32
}

type msg struct {
	hwnd     syscall.Handle
	message  uint32
	wParam   uintptr
	lParam   uintptr
	time     uint32
	ptX      int32
	ptY      int32
	lPrivate uint32
}

const (
	wmDestroy = 2
	wmClose   = 0x0010
	wmSize    = 5
	swShow    = 5

	wsOverlappedWindow = 0x00CF0000
	cwUseDefault       = 0x80000000

	smCxScreen = 0
	smCyScreen = 1
)

func windowProc(hwnd uintptr, msgID uint32, wParam, lParam uintptr) uintptr {
	switch msgID {
	case wmDestroy, wmClose:
		procPostQuitMessage.Call(0)
		return 0
	case wmSize:
		if globalChromium != nil {
			globalChromium.Resize()
		}
	}
	ret, _, _ := procDefWindowProcW.Call(hwnd, uintptr(msgID), wParam, lParam)
	return ret
}

func openWindow(url, title string, width, height int) {
	runtime.LockOSThread()

	procCoInitializeEx.Call(0, 0)

	hinst, _, _ := procGetModuleHandleW.Call(0)

	wc := wndClassEx{
		cbSize:        uint32(unsafe.Sizeof(wndClassEx{})),
		lpfnWndProc:   syscall.NewCallback(windowProc),
		hInstance:     windows.Handle(hinst),
		lpszClassName: className,
	}
	procRegisterClassExW.Call(uintptr(unsafe.Pointer(&wc)))

	r := rect{right: int32(width), bottom: int32(height)}
	procAdjustWindowRect.Call(uintptr(unsafe.Pointer(&r)), wsOverlappedWindow, 0)

	scrW, _, _ := procGetSystemMetrics.Call(smCxScreen)
	scrH, _, _ := procGetSystemMetrics.Call(smCyScreen)
	winW := int(r.right - r.left)
	winH := int(r.bottom - r.top)
	x := (int(scrW) - winW) / 2
	y := (int(scrH) - winH) / 2
	if x < 0 {
		x = 0
	}
	if y < 0 {
		y = 0
	}

	hwnd, _, _ := procCreateWindowExW.Call(
		0,
		uintptr(unsafe.Pointer(className)),
		uintptr(unsafe.Pointer(syscall.StringToUTF16Ptr(title))),
		wsOverlappedWindow,
		uintptr(x),
		uintptr(y),
		uintptr(winW),
		uintptr(winH),
		0, 0, hinst, 0,
	)
	if hwnd == 0 {
		log.Fatalf("CreateWindowExW failed: %d", windows.GetLastError())
	}

	chrom := edge.NewChromium()
	chrom.SetErrorCallback(func(err error) {
		log.Printf("[WebView2 ERROR] %v", err)
	})
	globalChromium = chrom
	ok := chrom.Embed(hwnd)
	log.Printf("[WebView2] Embed ok=%v", ok)
	if ok {
		chrom.Navigate(url)
		log.Printf("[WebView2] Navigate: %s", url)
		chrom.Show()
		chrom.Resize()
	} else {
		log.Printf("[WebView2] Embed failed!")
	}

	procShowWindow.Call(hwnd, swShow)
	procUpdateWindow.Call(hwnd)

	var m msg
	for {
		ret, _, _ := procGetMessageW.Call(uintptr(unsafe.Pointer(&m)), 0, 0, 0)
		if ret == 0 {
			break
		}
		procTranslateMessage.Call(uintptr(unsafe.Pointer(&m)))
		procDispatchMessageW.Call(uintptr(unsafe.Pointer(&m)))
	}
}
