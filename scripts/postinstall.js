#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillSource = path.join(projectRoot, "SKILL.md");
const homeDir = os.homedir();

const sharedSkillDir = path.join(homeDir, ".agents", "skills", "agent-ssh-cli");
const sharedSkillFile = path.join(sharedSkillDir, "SKILL.md");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copySkill() {
  ensureDir(sharedSkillDir);
  fs.copyFileSync(skillSource, sharedSkillFile);
}

function isSymlinkTo(linkPath, targetPath) {
  try {
    const stat = fs.lstatSync(linkPath);
    if (!stat.isSymbolicLink()) {
      return false;
    }
    const linked = fs.readlinkSync(linkPath);
    const resolvedLinked = path.resolve(path.dirname(linkPath), linked);
    return resolvedLinked === targetPath;
  } catch {
    return false;
  }
}

function ensureSkillLink(hostName) {
  const hostSkillsDir = path.join(homeDir, hostName, "skills");
  ensureDir(hostSkillsDir);

  const hostLinkPath = path.join(hostSkillsDir, "agent-ssh-cli");
  if (isSymlinkTo(hostLinkPath, sharedSkillDir)) {
    return;
  }

  if (fs.existsSync(hostLinkPath)) {
    fs.rmSync(hostLinkPath, { recursive: true, force: true });
  }

  const linkType = process.platform === "win32" ? "junction" : "dir";
  fs.symlinkSync(sharedSkillDir, hostLinkPath, linkType);
}

try {
  if (!fs.existsSync(skillSource)) {
    console.warn("[agent-ssh-cli] SKILL.md 不存在，跳过 skills 注册");
    process.exit(0);
  }

  copySkill();
  ensureSkillLink(".codex");
  ensureSkillLink(".claude");

  console.log("[agent-ssh-cli] skills 已注册到 ~/.agents/skills，并已为 ~/.codex/skills 与 ~/.claude/skills 创建链接");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[agent-ssh-cli] postinstall 跳过: ${message}`);
}
