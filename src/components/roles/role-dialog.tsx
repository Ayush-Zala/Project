"use client"

import * as React from "react"
import { useForm, type ControllerRenderProps } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
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
import { toast } from "sonner"
import { Loader2Icon } from "lucide-react"

const roleSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional().nullable(),
  colorCode: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color"),
  parentId: z.string().optional().nullable(),
})

type RoleFormValues = z.infer<typeof roleSchema>

interface RoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role?: any
  parents: { id: number; name: string }[]
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

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          parentId: values.parentId === "none" ? null : values.parentId
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Something went wrong")
      }

      toast.success(role ? "Role updated successfully" : "Role created successfully")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border/40 selection:bg-primary/30">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">
            {role ? "Edit Role" : "Create New Role"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {role ? "Modify existing role details and permissions." : "Define a new role for your system hierarchy."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }: { field: ControllerRenderProps<RoleFormValues, "name"> }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. System Administrator" {...field} className="bg-muted/30 border-border/40 focus:border-primary/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }: { field: ControllerRenderProps<RoleFormValues, "description"> }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide a brief overview of this role's purpose" 
                        className="resize-none bg-muted/30 border-border/40 focus:border-primary/50 min-h-[100px]" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="parentId"
                  render={({ field }: { field: ControllerRenderProps<RoleFormValues, "parentId"> }) => (
                    <FormItem>
                      <FormLabel>Parent Role</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-muted/30 border-border/40">
                            <SelectValue placeholder="None (Root)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border-border/40">
                          <SelectItem value="none">None (Root)</SelectItem>
                          {parents
                            .filter(p => !role || p.id !== role.id)
                            .map((p) => (
                              <SelectItem key={p.id} value={p.id.toString()}>
                                {p.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-[10px]">Inheritance level</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="colorCode"
                  render={({ field }: { field: ControllerRenderProps<RoleFormValues, "colorCode"> }) => (
                    <FormItem>
                      <FormLabel>Identity Color</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <div className="relative flex-1">
                            <Input 
                              {...field} 
                              className="pl-10 bg-muted/30 border-border/40" 
                              placeholder="#000000"
                            />
                            <div 
                              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-border/40"
                              style={{ backgroundColor: field.value }}
                            />
                          </div>
                        </FormControl>
                        <Input 
                          type="color" 
                          className="w-12 h-10 p-1 bg-transparent border-border/40 cursor-pointer"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="border-border/40 hover:bg-muted/50"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[100px]"
              >
                {isSubmitting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : (role ? "Save Changes" : "Create Role")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
