#!/bin/bash
# =============================================================================
# EG-Maps VNC Performance Optimization Script
# Usage: ./optimize_vnc.sh [action] [display] [port] [resolution] [depth]
# =============================================================================

ACTION="${1:-all}"
VNC_DISPLAY="${2:-:99}"
VNC_PORT="${3:-5900}"
XRES="${4:-1280x720}"
DEPTH="${5:-16}"

set -e

echo "=========================================="
echo "  EG-Maps VNC Performance Optimizer"
echo "=========================================="
echo "Action    : $ACTION"
echo "Display   : $VNC_DISPLAY"
echo "Port      : $VNC_PORT"
echo "Resolution: $XRES"
echo "Depth     : ${DEPTH}bpp"
echo "=========================================="

# ---------------------------------------------------------------------------
# Install dependencies
# ---------------------------------------------------------------------------
install_deps() {
    echo "[*] Checking dependencies..."
    local pkgs=""
    command -v x11vnc >/dev/null || pkgs="$pkgs x11vnc"
    command -v Xvfb >/dev/null || pkgs="$pkgs xvfb"
    command -v fluxbox >/dev/null || pkgs="$pkgs fluxbox"
    command -v xdotool >/dev/null || pkgs="$pkgs xdotool"
    command -v xdpyinfo >/dev/null || pkgs="$pkgs x11-utils"
    if [ -n "$pkgs" ]; then
        echo "[*] Installing:$pkgs"
        sudo apt-get update -qq && sudo apt-get install -y -qq $pkgs
    fi
    echo "[✓] Dependencies ready"
}

# ---------------------------------------------------------------------------
# Kill existing VNC processes
# ---------------------------------------------------------------------------
cleanup() {
    echo "[*] Cleaning up existing Xvfb/x11vnc processes..."
    sudo pkill -f "Xvfb $VNC_DISPLAY" 2>/dev/null || true
    pkill -f "x11vnc.*$VNC_PORT" 2>/dev/null || true
    sleep 1
    sudo rm -f "/tmp/.X11-unix/X${VNC_DISPLAY#:}" 2>/dev/null || true
    echo "[✓] Cleanup done"
}

# ---------------------------------------------------------------------------
# Start Xvfb with optimal settings
# ---------------------------------------------------------------------------
start_xvfb() {
    echo "[*] Starting Xvfb $VNC_DISPLAY at ${XRES}x${DEPTH}..."
    sudo Xvfb "$VNC_DISPLAY" -screen 0 "${XRES}x${DEPTH}" -ac \
        +extension GLX +render &
    XVFB_PID=$!
    echo "[*] Xvfb PID: $XVFB_PID"

    for i in $(seq 1 20); do
        if [ -e "/tmp/.X11-unix/X${VNC_DISPLAY#:}" ]; then
            echo "[✓] Xvfb is ready"
            break
        fi
        sleep 0.3
    done

    if [ ! -e "/tmp/.X11-unix/X${VNC_DISPLAY#:}" ]; then
        echo "[✗] Xvfb failed to start"
        exit 1
    fi

    export DISPLAY="$VNC_DISPLAY"
    xset -display "$DISPLAY" s off 2>/dev/null || true
    xset -display "$DISPLAY" -dpms 2>/dev/null || true
    xset -display "$DISPLAY" s noblank 2>/dev/null || true
}

# ---------------------------------------------------------------------------
# Start Fluxbox (no compositing)
# ---------------------------------------------------------------------------
start_wm() {
    echo "[*] Starting Fluxbox window manager..."
    fluxbox -display "$DISPLAY" 2>/dev/null &
    FLUXBOX_PID=$!
    sleep 0.5
    echo "[✓] Fluxbox started (PID: $FLUXBOX_PID)"
    mkdir -p "$HOME/.fluxbox"
    echo "session.compositing: false" >> "$HOME/.fluxbox/init" 2>/dev/null || true
}

# ---------------------------------------------------------------------------
# Start x11vnc with MAXIMUM PERFORMANCE tuning
# ---------------------------------------------------------------------------
start_x11vnc() {
    echo "[*] Starting x11vnc with optimized performance flags..."
    echo "    wait:15  defer:10  wait_ui:4  setdefer:-2"
    echo "    progressive:3  scrollcopyrect:3  nowait_bog"
    echo "    cursor:arrow  tightfilexfer  compare"

    x11vnc -display "$DISPLAY" \
        -rfbport "$VNC_PORT" \
        -localhost \
        -forever \
        -shared \
        -bg \
        -nopw \
        -quiet \
        -wait 15 \
        -defer 10 \
        -wait_ui 4 \
        -setdefer -2 \
        -nowait_bog \
        -progressive 3 \
        -scrollcopyrect 3 \
        -wireframe \
        -nowireframelocal \
        -ncache 0 \
        -cursor arrow \
        -tightfilexfer \
        -rfbversion 3.6 \
        -readtimeout 30 \
        -compare \
        -nodpms \
        -xkb \
        -noxdamage \
        -nofbpm \
        2>&1

    echo "[✓] x11vnc started on port $VNC_PORT"
    local pid=$(pgrep -f "x11vnc.*$VNC_PORT" | head -1)
    echo "[*] x11vnc PID: $pid"
}

# ---------------------------------------------------------------------------
# Tune kernel network parameters
# ---------------------------------------------------------------------------
tune_network() {
    echo "[*] Tuning kernel network parameters..."
    sudo sysctl -w net.core.rmem_max=16777216 2>/dev/null || true
    sudo sysctl -w net.core.wmem_max=16777216 2>/dev/null || true
    sudo sysctl -w net.ipv4.tcp_rmem='4096 87380 16777216' 2>/dev/null || true
    sudo sysctl -w net.ipv4.tcp_wmem='4096 65536 16777216' 2>/dev/null || true
    sudo sysctl -w net.ipv4.tcp_window_scaling=1 2>/dev/null || true
    sudo sysctl -w net.ipv4.tcp_mtu_probing=1 2>/dev/null || true
    if lsmod 2>/dev/null | grep -q tcp_bbr; then
        sudo sysctl -w net.ipv4.tcp_congestion_control=bbr 2>/dev/null || true
    fi
    echo "[✓] Network tuning applied"
    sysctl net.core.rmem_max net.core.wmem_max 2>/dev/null
}

# ---------------------------------------------------------------------------
# Benchmark tool
# ---------------------------------------------------------------------------
benchmark() {
    local DISP="${1:-$VNC_DISPLAY}"
    echo "=========================================="
    echo "  VNC Performance Benchmark"
    echo "=========================================="
    echo "Display: $DISP"

    echo ""
    echo "[Display Info]"
    xdpyinfo -display "$DISP" 2>/dev/null | grep -E 'dimensions|depth|resolution' || true

    echo ""
    echo "[Interaction Test]"
    xterm -display "$DISP" -e "bash -c '
        for i in {1..3}; do
            for y in {0..100..20}; do
                xdotool mousemove \$((i * 50)) \$y 2>/dev/null
            done
            sleep 0.1
        done
        echo Interaction done
        sleep 1
    '" 2>/dev/null &
    local XPID=$!
    sleep 3
    kill $XPID 2>/dev/null || true
    echo "  [✓] Interaction test done"

    echo ""
    echo "[x11vnc Stats]"
    local xpid=$(pgrep -f "x11vnc.*$VNC_PORT" | head -1)
    if [ -n "$xpid" ]; then
        ps -p "$xpid" -o pid,%cpu,%mem,rss,etime --no-headers 2>/dev/null || true
    fi

    echo ""
    echo "[System]"
    echo "  CPUs: $(nproc)"
    echo "  Memory: $(free -m | awk '/Mem:/{print $2}') MB"
    echo "  Load: $(uptime | awk -F'load average:' '{print $2}')"
    echo "=========================================="
}

# ---------------------------------------------------------------------------
# Video/FPS stress test
# ---------------------------------------------------------------------------
video_fps_test() {
    local DISP="${1:-$VNC_DISPLAY}"
    local SECONDS="${2:-8}"
    echo "=========================================="
    echo "  Video/FPS Stress Test"
    echo "=========================================="
    echo "Display: $DISP"
    echo "Duration: ${SECONDS}s"

    local xpid=$(pgrep -f "x11vnc.*$VNC_PORT" | head -1)
    if [ -n "$xpid" ]; then
        echo ""
        echo "x11vnc CPU monitoring:"
        for i in $(seq 1 $SECONDS); do
            local cpu=$(ps -p "$xpid" -o %cpu --no-headers 2>/dev/null || echo "0")
            printf "  sec %2d: CPU: %5.1f%%
" "$i" "$cpu"
            sleep 1
        done
    fi

    echo ""
    echo "Running screen animation..."
    local anim_sh="/tmp/vnc_stress_$$.sh"
    cat > "$anim_sh" << 'ANIMEOF'
#!/bin/bash
D=$1; S=$2
export DISPLAY="$D"
END=$((SECONDS + S))
while [ $SECONDS -lt $END ]; do
    for a in 0 45 90 135 180 225 270 315; do
        rad=$(echo "scale=4; $a * 3.14159 / 180" | bc -l 2>/dev/null || echo 0)
        x=$(echo "scale=0; 640 + 150 * c($rad)" | bc -l 2>/dev/null || echo 640)
        y=$(echo "scale=0; 360 + 150 * s($rad)" | bc -l 2>/dev/null || echo 360)
        xdotool mousemove ${x%.*} ${y%.*} 2>/dev/null || true
    done
done
ANIMEOF
    chmod +x "$anim_sh"
    "$anim_sh" "$DISP" "$SECONDS" &
    local APID=$!
    sleep $((SECONDS + 1))
    kill $APID 2>/dev/null || true
    rm -f "$anim_sh"

    echo ""
    echo "[Final x11vnc Stats]"
    if [ -n "$xpid" ]; then
        ps -p "$xpid" -o pid,%cpu,%mem,rss,etime --no-headers 2>/dev/null || true
    fi
    echo "=========================================="
}


# ---------------------------------------------------------------------------
# Status display
# ---------------------------------------------------------------------------
status() {
    echo "=== Xvfb ==="
    ps aux | grep Xvfb | grep -v grep || echo "Not running"
    echo "=== x11vnc ==="
    ps aux | grep x11vnc | grep -v grep || echo "Not running"
    echo "=== WM ==="
    ps aux | grep fluxbox | grep -v grep || echo "Not running"
    echo "=== Port $VNC_PORT ==="
    ss -tlnp | grep "$VNC_PORT" || echo "Not listening"
    echo "=== Display $VNC_DISPLAY ==="
    local sock="/tmp/.X11-unix/X${VNC_DISPLAY#:}"
    if [ -e "$sock" ]; then
        echo "Active"
        xdpyinfo -display "$VNC_DISPLAY" 2>/dev/null | grep -E 'dimensions|depth'
    else
        echo "Not active"
    fi
}

# ---------------------------------------------------------------------------
# Main dispatch
# ---------------------------------------------------------------------------
case "$ACTION" in
    install)
        install_deps
        ;;
    cleanup)
        cleanup
        ;;
    start)
        cleanup
        tune_network
        start_xvfb
        start_wm
        start_x11vnc
        echo "[OK] All services started on :$VNC_PORT (display $VNC_DISPLAY)"
        ;;
    stop)
        cleanup
        echo "[OK] All services stopped"
        ;;
    restart)
        cleanup
        tune_network
        start_xvfb
        start_wm
        start_x11vnc
        echo "[OK] Restarted with optimized settings"
        ;;
    benchmark)
        benchmark
        ;;
    video-test)
        video_fps_test "$VNC_DISPLAY" 8
        ;;
    status)
        status
        ;;
    all|*)
        install_deps
        cleanup
        tune_network
        start_xvfb
        start_wm
        start_x11vnc
        echo ""
        echo "=========================================="
        echo "  VNC Optimization Complete!"
        echo "=========================================="
        echo "  Connect: localhost:$VNC_PORT"
        echo "  Display: $VNC_DISPLAY ($XRES @ ${DEPTH}bpp)"
        echo ""
        echo "  Commands:"
        echo "    $0 status         - Check status"
        echo "    $0 benchmark      - Run benchmark"
        echo "    $0 video-test     - Run FPS stress test"
        echo "    $0 stop           - Stop VNC"
        echo "=========================================="
        ;;
esac

