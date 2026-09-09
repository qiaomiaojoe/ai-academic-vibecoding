#!/usr/bin/env bash
# 安装新 skill；同名版本默认保留。明确 --update NAME 才备份后更新。
# 本地预览：bash install.sh --source /path/to/repo --target /path/to/skills
set -euo pipefail

REPO_URL="https://github.com/qiaomiaojoe/ai-academic-vibecoding.git"
SOURCE_DIR=""
TARGETS=()
UPDATE_NAMES=()
DOWNLOAD_DIR=""
STAGE_DIR=""
PENDING_BACKUP=""
PENDING_DEST=""
INSTALLED=0
UPDATED=0
SKIPPED=0

usage() {
    cat <<'HELP'
用法：bash install.sh [--source 仓库目录] [--target skills目录] [--update skill名]
  默认下载课程仓库，安装到检测到的 Claude Code / Codex skills 目录。
  同名版本默认保留；--update 可重复，仅更新点名的 skill（先备份）。
  --source 使用本地仓库，无需网络；--target 可重复，指定安装位置。
HELP
}
fail() { echo "错误：$*" >&2; exit 1; }
cleanup() {
    local status=$?
    trap - EXIT
    if [ -n "$PENDING_BACKUP" ] && [ -e "$PENDING_BACKUP" ] && [ ! -e "$PENDING_DEST" ]; then
        if ! mv -- "$PENDING_BACKUP" "$PENDING_DEST"; then
            echo "旧版本仍保留在：$PENDING_BACKUP" >&2
            status=1
        fi
    fi
    if [ -n "$STAGE_DIR" ] && [ -d "$STAGE_DIR" ]; then rm -rf -- "$STAGE_DIR"; fi
    if [ -n "$DOWNLOAD_DIR" ] && [ -d "$DOWNLOAD_DIR" ]; then rm -rf -- "$DOWNLOAD_DIR"; fi
    exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
while [ "$#" -gt 0 ]; do
    case "$1" in
        --source|--target|--update)
            [ "$#" -ge 2 ] && [ -n "$2" ] || fail "$1 缺少参数"
            case "$1" in
                --source) SOURCE_DIR="$2" ;;
                --target) TARGETS+=("$2") ;;
                --update)
                    [[ "$2" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || fail "无效 skill 名：$2"
                    UPDATE_NAMES+=("$2") ;;
            esac
            shift 2 ;;
        --help|-h) usage; exit 0 ;;
        *) usage >&2; fail "未知参数：$1" ;;
    esac
done

if [ ${#TARGETS[@]} -eq 0 ]; then
    if [ -d "$HOME/.claude" ]; then TARGETS+=("$HOME/.claude/skills"); fi
    CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
    if [ -d "$CODEX_DIR" ]; then TARGETS+=("$CODEX_DIR/skills"); fi
    [ ${#TARGETS[@]} -gt 0 ] || fail "未发现 Claude Code / Codex 目录；可用 --target 指定安装位置。"
fi
if [ -z "$SOURCE_DIR" ]; then
    command -v git >/dev/null 2>&1 || fail "未找到 git；可下载仓库后用 --source 安装。"
    DOWNLOAD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/aidev-download.XXXXXX")"
    echo "下载课程 skills..."
    git clone --depth 1 --quiet "$REPO_URL" "$DOWNLOAD_DIR/repo"
    SOURCE_DIR="$DOWNLOAD_DIR/repo"
fi
[ -d "$SOURCE_DIR/skills" ] || fail "仓库中没有 skills/：$SOURCE_DIR"
SOURCE_DIR="$(cd "$SOURCE_DIR" && pwd -P)"
if [ ${#UPDATE_NAMES[@]} -gt 0 ]; then
for requested in "${UPDATE_NAMES[@]}"; do
    [ -f "$SOURCE_DIR/skills/$requested/SKILL.md" ] || fail "仓库中没有要更新的 skill：$requested"
done
fi
shopt -s nullglob
SOURCES=("$SOURCE_DIR"/skills/*/)
[ ${#SOURCES[@]} -gt 0 ] || fail "skills/ 为空"

should_update() {
    local candidate
    [ ${#UPDATE_NAMES[@]} -gt 0 ] || return 1
    for candidate in "${UPDATE_NAMES[@]}"; do
        if [ "$candidate" = "$1" ]; then return 0; fi
    done
    return 1
}
for target_arg in "${TARGETS[@]}"; do
    mkdir -p -- "$target_arg"
    TARGET_DIR="$(cd "$target_arg" && pwd -P)"
    echo "安装位置：$TARGET_DIR"
    for skill_source in "${SOURCES[@]}"; do
        skill_name="$(basename "$skill_source")"
        [ -f "$skill_source/SKILL.md" ] || continue
        [[ "$skill_name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || fail "源目录名称无效：$skill_name"
        DEST="$TARGET_DIR/$skill_name"
        if [ -e "$DEST" ] || [ -L "$DEST" ]; then
            if ! should_update "$skill_name"; then
                echo "保留：$skill_name（更新需 --update $skill_name）"
                SKIPPED=$((SKIPPED + 1)); continue
            fi
            [ ! -L "$DEST" ] || fail "目标是符号链接，先确认其用途后手动处理：$DEST"
            [ -d "$DEST" ] || fail "同名目标不是目录：$DEST"
            if diff -qr "$skill_source" "$DEST" >/dev/null 2>&1; then
                echo "一致：$skill_name（无需更新）"
                SKIPPED=$((SKIPPED + 1)); continue
            fi
        fi
        # 完整复制成功后才移动旧版本。暂存目录和备份均放在 skills 目录外。
        STAGE_DIR="$(mktemp -d "$TARGET_DIR/../.aidev-stage.XXXXXX")"
        cp -R "$skill_source" "$STAGE_DIR/new"
        BACKUP_PATH=""
        if [ -d "$DEST" ]; then
            BACKUP_ROOT="$TARGET_DIR/../.ai-academic-vibecoding-backups"
            mkdir -p -- "$BACKUP_ROOT"
            BACKUP_DIR="$(mktemp -d "$BACKUP_ROOT/${skill_name}-$(date +%Y%m%d-%H%M%S).XXXXXX")"
            BACKUP_PATH="$BACKUP_DIR/$skill_name"
            PENDING_BACKUP="$BACKUP_PATH"
            PENDING_DEST="$DEST"
            mv -- "$DEST" "$BACKUP_PATH"
        fi
        if ! mv -- "$STAGE_DIR/new" "$DEST"; then
            if [ -n "$BACKUP_PATH" ]; then mv -- "$BACKUP_PATH" "$DEST"; fi
            fail "安装失败，已尝试恢复旧版本：$skill_name"
        fi
        PENDING_BACKUP=""
        PENDING_DEST=""
        rmdir -- "$STAGE_DIR"
        STAGE_DIR=""
        if [ -n "$BACKUP_PATH" ]; then
            echo "更新：${skill_name}；旧版备份：$BACKUP_PATH"
            UPDATED=$((UPDATED + 1))
        else
            echo "新增：$skill_name"
            INSTALLED=$((INSTALLED + 1))
        fi
    done
done

echo "完成：新增 ${INSTALLED}，更新 ${UPDATED}，保留 ${SKIPPED}。"
echo "重新加载目标平台的 skills 后使用；保留项不会自动升级。"
