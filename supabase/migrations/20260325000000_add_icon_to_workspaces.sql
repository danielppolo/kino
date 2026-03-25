-- Migration: Add icon support to workspaces
ALTER TABLE workspaces
ADD COLUMN icon TEXT;
