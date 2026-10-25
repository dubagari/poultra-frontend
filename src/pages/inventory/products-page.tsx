import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Boxes, Pencil } from "lucide-react";
import {
  listProducts,
  createProduct,
  updateProduct,
  type Product,
} from "@/api/products";
import { useBusinesses } from "@/context/BusinessContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPE_LABELS: Record<Product["type"], string> = {
  FEED: "Feed",
  EGG: "Egg",
  LIVE_BIRD: "Live bird",
  PROCESSED_BIRD: "Processed bird",
  MEDICATION: "Medication",
  OTHER: "Other",
};

const UNIT_LABELS: Record<Product["unit"], string> = {
  KG: "Kilogram",
  BAG: "Bag",
  PIECE: "Piece",
  TRAY: "Tray",
};

interface FormState {
  name: string;
  code: string;
  type: Product["type"];
  unit: Product["unit"];
  description: string;
  status: Product["status"];
}

const EMPTY_FORM: FormState = {
  name: "",
  code: "",
  type: "FEED",
  unit: "BAG",
  description: "",
  status: "ACTIVE",
};

export function ProductsPage(): ReactNode {
  const { activeBusiness } = useBusinesses();
  const businessId = activeBusiness?.id;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const productsQuery = useQuery({
    queryKey: ["products", businessId],
    queryFn: () => listProducts(businessId as string),
    enabled: Boolean(businessId),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const input = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        type: form.type,
        unit: form.unit,
        ...(form.description.trim()
          ? { description: form.description.trim() }
          : {}),
        status: form.status,
      };

      if (editing) {
        return updateProduct(editing.id, input);
      }
      return createProduct(businessId as string, input);
    },
    onSuccess: () => {
      toast.success(editing ? "Product updated" : "Product created");
      void queryClient.invalidateQueries({
        queryKey: ["products", businessId],
      });
      setDialogOpen(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      code: product.code,
      type: product.type,
      unit: product.unit,
      description: product.description ?? "",
      status: product.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim() || form.code.trim().length < 2) {
      toast.error("Name and a code of at least 2 characters are required");
      return;
    }

    saveMutation.mutate();
  };

  const products = productsQuery.data ?? [];
  const filtered = useMemo(() => {
    if (!search.trim()) return products;

    const needle = search.trim().toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(needle) ||
        product.code.toLowerCase().includes(needle)
    );
  }, [products, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            What you sell — eggs, feed, birds and more
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Add product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All products</CardTitle>
          <CardDescription>
            {productsQuery.isLoading
              ? "Loading products..."
              : `${filtered.length} of ${products.length} shown`}
          </CardDescription>
          <Input
            placeholder="Search by name or code"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsQuery.isLoading ? (
                [1, 2, 3].map((row) => (
                  <TableRow key={row}>
                    {["a", "b", "c"].map((key) => (
                      <TableCell key={key}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-5 w-16" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Boxes className="size-4" />
                      {search
                        ? "No products match your search"
                        : "No products yet. Add one to start selling!"}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {product.name}
                      {product.description && (
                        <div className="text-xs text-muted-foreground">
                          {product.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {product.code}
                    </TableCell>
                    <TableCell>{TYPE_LABELS[product.type]}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {UNIT_LABELS[product.unit]}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          product.status === "ACTIVE"
                            ? "default"
                            : "outline"
                        }
                      >
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(product)}
                      >
                        <Pencil /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit product" : "Add product"}
            </DialogTitle>
            <DialogDescription>
              Products are tracked in inventory and sold in orders.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-name">Name</Label>
                <Input
                  id="product-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-code">Code</Label>
                <Input
                  id="product-code"
                  value={form.code}
                  onChange={(event) =>
                    setForm({ ...form, code: event.target.value })
                  }
                  placeholder="e.g. EGG-CRATE"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    setForm({ ...form, type: value as FormState["type"] })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FEED">Feed</SelectItem>
                    <SelectItem value="EGG">Egg</SelectItem>
                    <SelectItem value="LIVE_BIRD">Live bird</SelectItem>
                    <SelectItem value="PROCESSED_BIRD">
                      Processed bird
                    </SelectItem>
                    <SelectItem value="MEDICATION">Medication</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select
                  value={form.unit}
                  onValueChange={(value) =>
                    setForm({ ...form, unit: value as FormState["unit"] })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KG">Kilogram</SelectItem>
                    <SelectItem value="BAG">Bag</SelectItem>
                    <SelectItem value="PIECE">Piece</SelectItem>
                    <SelectItem value="TRAY">Tray</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-description">
                Description (optional)
              </Label>
              <Input
                id="product-description"
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm({ ...form, status: value as FormState["status"] })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending
                  ? "Saving..."
                  : editing
                    ? "Save changes"
                    : "Add product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
