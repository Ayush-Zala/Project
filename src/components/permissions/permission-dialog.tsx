"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RefreshCwIcon, KeyIcon } from "lucide-react"
import { apiClient } from "@/lib/api-client"

const permissionSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50),
  resource: z.string().min(2, "Resource is required (e.g. users, roles)"),
  action: z.string().min(2, "Action is required (e.g. read, create, delete)"),
  description: z.string().max(200).optional().nullable(),
});

type PermissionFormValues = z.infer<typeof permissionSchema>;

interface PermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permission?: any;
  onSuccess?: () => void;
}

export function PermissionDialog({ open, onOpenChange, permission, onSuccess }: PermissionDialogProps) {
  const isEditing = !!permission;
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionSchema),
    defaultValues: {
      name: "",
      resource: "",
      action: "",
      description: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      if (permission) {
        form.reset({
          name: permission.name,
          resource: permission.resource,
          action: permission.action,
          description: permission.description || "",
        });
      } else {
        form.reset({
          name: "",
          resource: "",
          action: "",
          description: "",
        });
      }
    }
  }, [open, permission, form]);

  async function onSubmit(values: PermissionFormValues) {
    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/permissions/${permission.id}` : "/api/permissions";
      const method = isEditing ? "PATCH" : "POST";

      await apiClient(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      // apiClient already handled toast
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-background border-input selection:bg-primary/30 p-0 overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
        <div className="p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-black uppercase tracking-tight">
              {isEditing ? "Edit Permission" : "Create Permission"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Permission Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Create Infrastructure Users" {...field} className="bg-background border-input focus:border-primary/50 font-bold transition-all text-sm h-10" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="resource"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Resource</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. users"
                            disabled={isEditing}
                            {...field}
                            className="bg-background border-input focus:border-primary/50 rounded-xl font-mono font-bold text-sm h-10"
                          />
                        </FormControl>
                        <FormMessage className="text-[10px] font-bold" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="action"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Action</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. create"
                            disabled={isEditing}
                            {...field}
                            className="bg-background border-input focus:border-primary/50 rounded-xl font-mono font-bold text-sm h-10"
                          />
                        </FormControl>
                        <FormMessage className="text-[10px] font-bold" />
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch("resource") && form.watch("action") && !isEditing && (
                  <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                    <p className="text-[10px] uppercase tracking-widest font-black text-primary mb-1">Generated Slug</p>
                    <code className="text-sm font-mono font-bold text-foreground opacity-80">
                      {form.watch("resource").toLowerCase()}:{form.watch("action").toLowerCase()}
                    </code>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Purpose & Context</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe why this permission exists..."
                          className="resize-none bg-background border-input focus:border-primary/50 min-h-[80px] font-medium transition-all text-xs py-3"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="pt-6 border-t border-border/10 -mx-6 px-6 bg-muted/5 mt-6 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="h-10 text-[11px] font-black uppercase tracking-widest hover:bg-muted/50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[11px] px-8 h-10 shadow-lg shadow-primary/20 active:scale-95 transition-all flex gap-2"
                >
                  {isSubmitting && <RefreshCwIcon className="h-4 w-4 animate-spin" />}
                  {isEditing ? "Save Changes" : "Create Permission"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
