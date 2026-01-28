"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddMemberFormData {
  email: string;
  role: "owner" | "editor" | "reader";
}

interface AddMemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AddMemberFormData) => Promise<void>;
  isLoading?: boolean;
}

export function AddMemberForm({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: AddMemberFormProps) {
  const form = useForm<AddMemberFormData>({
    defaultValues: {
      email: "",
      role: "editor",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        email: "",
        role: "editor",
      });
    }
  }, [open, form]);

  const handleSubmit = async (values: AddMemberFormData) => {
    try {
      await onSubmit(values);
      toast.success("Member added successfully!");
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add member",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
          <DialogDescription>
            Add a new member to this workspace by their email address.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="email"
              rules={{
                required: "Email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Invalid email address",
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              rules={{ required: "Role is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="reader">Reader</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Owner: Full access, manage members, delete workspace
                    <br />
                    Editor: Create/edit/delete wallets and transactions
                    <br />
                    Reader: Read-only access
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Member"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
