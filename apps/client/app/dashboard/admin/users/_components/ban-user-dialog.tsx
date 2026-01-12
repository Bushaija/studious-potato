"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader, UserX } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { User } from "@/types/user";
import { useMediaQuery } from "@/hooks/use-media-query";
import useBanUser from "@/hooks/mutations/users/use-ban-user";

const banUserSchema = z.object({
  banReason: z.string().min(1, "Ban reason is required"),
  banExpiresIn: z.number().min(1, "Must be at least 1 day").max(365, "Cannot exceed 365 days"),
});

type BanUserFormData = z.infer<typeof banUserSchema>;

interface BanUserDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  user: User | null;
  onSuccess?: () => void;
}

export function BanUserDialog({ user, onSuccess, ...props }: BanUserDialogProps) {
  const [isBanPending, startBanTransition] = React.useTransition();
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const banUserMutation = useBanUser();

  const form = useForm<BanUserFormData>({
    resolver: zodResolver(banUserSchema),
    defaultValues: {
      banReason: "",
      banExpiresIn: 30,
    },
  });

  function onBan(data: BanUserFormData) {
    if (!user) return;

    startBanTransition(async () => {
      try {
        await banUserMutation.mutateAsync({
          userId: user.id,
          banReason: data.banReason,
          banExpiresIn: data.banExpiresIn,
        });

        props.onOpenChange?.(false);
        toast.success("User banned successfully");
        onSuccess?.();
        form.reset();
      } catch (error) {
        toast.error("Failed to ban user");
      }
    });
  }

  if (isDesktop) {
    return (
      <Dialog {...props}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Are you sure you want to ban <span className="font-medium">{user?.name}</span>? 
              This action will prevent them from accessing the system.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onBan)} className="space-y-4">
              <FormField
                control={form.control}
                name="banReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ban Reason</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter reason for banning this user..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="banExpiresIn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ban Duration (days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                  variant="destructive"
                  disabled={isBanPending}
                >
                  {isBanPending && (
                    <Loader
                      className="mr-2 size-4 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  <UserX className="mr-2 size-4" />
                  Ban User
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
          <DrawerTitle>Ban User</DrawerTitle>
          <DrawerDescription>
            Are you sure you want to ban <span className="font-medium">{user?.name}</span>? 
            This action will prevent them from accessing the system.
          </DrawerDescription>
        </DrawerHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onBan)} className="space-y-4 p-4">
            <FormField
              control={form.control}
              name="banReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ban Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter reason for banning this user..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="banExpiresIn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ban Duration (days)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                variant="destructive"
                disabled={isBanPending}
              >
                {isBanPending && (
                  <Loader
                    className="mr-2 size-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                <UserX className="mr-2 size-4" />
                Ban User
              </Button>
            </DrawerFooter>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  );
}
