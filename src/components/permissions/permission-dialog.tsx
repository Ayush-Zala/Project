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
import { toast } from "sonner"
import { RefreshCwIcon, KeyIcon } from "lucide-react"

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

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save permission");

      toast.success(isEditing ? "Permission definition updated" : "New permission registered in manifest");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-input bg-background/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
        <DialogHeader className="p-6 bg-muted/20 border-b border-input relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-8 -mt-8" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2 bg-primary/10 rounded-lg">
              <KeyIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {isEditing ? "Modify Permission" : "Define Permission"}
              </DialogTitle>
              <DialogDescription className="text-xs mt-1">
                Establish granular access controls for system resources.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Permission Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Create Infrastructure Users" {...field} className="bg-background border-input focus:border-primary/50 rounded-xl" />
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
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Resource</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. users" 
                        disabled={isEditing} 
                        {...field} 
                        className="bg-background border-input focus:border-primary/50 rounded-xl font-mono text-sm" 
                      />
                    </FormControl>
                    <FormDescription className="text-[9px]">Resource namespace.</FormDescription>
                    <FormMessage className="text-[10px] font-bold" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="action"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Action</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. create" 
                        disabled={isEditing} 
                        {...field} 
                        className="bg-background border-input focus:border-primary/50 rounded-xl font-mono text-sm" 
                      />
                    </FormControl>
                    <FormDescription className="text-[9px]">Operation name.</FormDescription>
                    <FormMessage className="text-[10px] font-bold" />
                  </FormItem>
                )}
              />
            </div>

            {form.watch("resource") && form.watch("action") && !isEditing && (
              <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-[10px] uppercase tracking-widest font-bold text-primary mb-1">Generated Slug</p>
                <code className="text-sm font-mono font-bold text-foreground opacity-80">
                  {form.watch("resource").toLowerCase()}:{form.watch("action").toLowerCase()}
                </code>
              </div>
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Purpose & Context</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe why this permission exists..." 
                      className="bg-background border-input focus:border-primary/50 rounded-xl min-h-[80px]" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] font-bold" />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 gap-3 border-t border-border/20">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl border-input hover:bg-muted/50 font-bold px-6">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 shadow-lg shadow-primary/20 transition-all active:scale-95">
                {isSubmitting && <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Seal Changes" : "Commit to Manifest"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
