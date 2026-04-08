"use client"

import * as React from "react"
import { useForm, type ControllerRenderProps } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2Icon } from "lucide-react"
import { apiClient } from "@/lib/api-client"

const roleSchema = z.object({
  name: z.string()
    .min(3, "Role name must be at least 3 characters")
    .max(40, "Role name must not exceed 40 characters")
    .regex(/^[a-zA-Z0-9\s-]+$/, "Special characters are not allowed"),
  description: z.string().max(200, "Description too long").optional().nullable(),
  colorCode: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color"),
  parentId: z.string().optional().nullable(),
})

type RoleFormValues = z.infer<typeof roleSchema>

interface RoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role?: any
  parents: { id: number; name: string; slug?: string }[]
  onSuccess: () => void
}

export function RoleDialog({ open, onOpenChange, role, parents, onSuccess }: RoleDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      description: "",
      colorCode: "#3b82f6",
      parentId: "none",
    },
  })

  React.useEffect(() => {
    if (role) {
      form.reset({
        name: role.name,
        description: role.description || "",
        colorCode: role.colorCode || "#3b82f6",
        parentId: role.parentId?.toString() || "none",
      })
    } else {
      form.reset({
        name: "",
        description: "",
        colorCode: "#3b82f6",
        parentId: "none",
      })
    }
  }, [role, form])

  async function onSubmit(values: RoleFormValues) {
    setIsSubmitting(true)
    try {
      const url = role ? `/api/roles/${role.id}` : "/api/roles"
      const method = role ? "PATCH" : "POST"

      await apiClient(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          parentId: values.parentId === "none" ? null : values.parentId
        }),
      })

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      // apiClient already handled toast
    } finally {
      setIsSubmitting(false)
    }
  }

  // 🛡️ Hierarchy Filter: Block circular inheritance
  const filteredParents = React.useMemo(() => {
    return parents.filter(p => 
      !role || p.id !== role.id // Block circular inheritance
    )
  }, [parents, role])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-background border-input selection:bg-primary/30 p-0 overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
        <div className="p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black uppercase tracking-tight">
              {role ? "Edit Role" : "Create New Role"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }: { field: ControllerRenderProps<RoleFormValues, "name"> }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Role Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. System Administrator" {...field} className="bg-background border-input focus:border-primary/50 font-bold transition-all text-sm h-10" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }: { field: ControllerRenderProps<RoleFormValues, "description"> }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Provide a brief overview of this role's purpose" 
                          className="resize-none bg-background border-input focus:border-primary/50 min-h-[80px] font-medium transition-all text-xs py-3" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parentId"
                  render={({ field }: { field: ControllerRenderProps<RoleFormValues, "parentId"> }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Parent Role</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background border-input h-10 font-bold text-xs transition-all">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border-input">
                          <SelectItem value="none" className="text-[11px] font-bold uppercase tracking-tight">None</SelectItem>
                          {filteredParents.map((p) => (
                            <SelectItem key={p.id} value={p.id.toString()} className="text-[11px] font-bold uppercase tracking-tight">
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[11px] px-8 h-10 shadow-lg shadow-primary/20 active:scale-95 transition-all"
                >
                    {isSubmitting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : (role ? "Save Changes" : "Create Role")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
