"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader, UserCheck } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import type { User } from "@/types/user";
import { useMediaQuery } from "@/hooks/use-media-query";
import useUnbanUser from "@/hooks/mutations/users/use-unban-user";

const unbanUserSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});

type UnbanUserFormData = z.infer<typeof unbanUserSchema>;

interface UnbanUserDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  user: User | null;
  onSuccess?: () => void;
}

export function UnbanUserDialog({ user, onSuccess, ...props }: UnbanUserDialogProps) {
  const [isUnbanPending, startUnbanTransition] = React.useTransition();
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const unbanUserMutation = useUnbanUser();

  const form = useForm<UnbanUserFormData>({
    resolver: zodResolver(unbanUserSchema),
    defaultValues: {
      reason: "",
    },
  });

  function onUnban(data: UnbanUserFormData) {
    if (!user) return;

    startUnbanTransition(async () => {
      try {
        await unbanUserMutation.mutateAsync({
          userId: user.id,
          reason: data.reason,
        });

        props.onOpenChange?.(false);
        toast.success("User unbanned successfully");
        onSuccess?.();
        form.reset();
      } catch (error) {
        toast.error("Failed to unban user");
      }
    });
  }

  if (isDesktop) {
    return (
      <Dialog {...props}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unban User</DialogTitle>
            <DialogDescription>
              Are you sure you want to unban <span className="font-medium">{user?.name}</span>? 
              This will restore their access to the system.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onUnban)} className="space-y-4">
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Unbanning</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter reason for unbanning this user..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2 sm:space-x-0">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  type="submit"
                  variant="default"
                  disabled={isUnbanPending}
                >
                  {isUnbanPending && (
                    <Loader
                      className="mr-2 size-4 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  <UserCheck className="mr-2 size-4" />
                  Unban User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer {...props}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Unban User</DrawerTitle>
          <DrawerDescription>
            Are you sure you want to unban <span className="font-medium">{user?.name}</span>? 
            This will restore their access to the system.
          </DrawerDescription>
        </DrawerHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onUnban)} className="space-y-4 p-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Unbanning</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter reason for unbanning this user..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DrawerFooter className="gap-2 sm:space-x-0">
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
              <Button
                type="submit"
                variant="default"
                disabled={isUnbanPending}
              >
                {isUnbanPending && (
                  <Loader
                    className="mr-2 size-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                <UserCheck className="mr-2 size-4" />
                Unban User
              </Button>
            </DrawerFooter>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  );
}
