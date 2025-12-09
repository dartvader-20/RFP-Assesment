import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import VendorSkeleton from "../Loader/VendorSkeleton";

const vendorCategories = [
  "IT",
  "FURNITURE",
  "OFFICE_SUPPLIES",
  "EQUIPMENT",
  "LOGISTICS",
  "OTHER",
];

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editVendor, setEditVendor] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    category: "",
  });

  // Fetch Vendors
  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/vendors`);
      const mapped = res.data.vendors.map((v) => ({
        id: v.vendorId,
        name: v.name,
        email: v.email,
        phone: v.contactNumber,
        category: v.vendorType,
      }));
      setVendors(mapped);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (vendor = null) => {
    setEditVendor(vendor);
    if (vendor) {
      setForm({
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        category: vendor.category,
      });
    } else {
      setForm({ name: "", email: "", phone: "", category: "" });
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Add / Edit Vendor
  const handleSave = async () => {
    setSaving(true);

    const payload = {
      vendorId: editVendor?.id, // include vendorId for PUT
      name: form.name,
      email: form.email,
      vendorType: form.category,
      contactNumber: form.phone,
    };

    try {
      if (editVendor) {
        // Update API (PUT)
        await axios.put(
          `${API_BASE_URL}/api/vendors/${editVendor.id}`,
          payload
        );
        setVendors(
          vendors.map((v) =>
            v.id === editVendor.id ? { id: editVendor.id, ...form } : v
          )
        );
      } else {
        // Create API (POST)
        const res = await axios.post(`${API_BASE_URL}/api/vendors`, payload);
        const newVendor = {
          id: res.data.vendorId || Date.now(),
          name: form.name,
          email: form.email,
          phone: form.phone,
          category: form.category,
        };
        setVendors([...vendors, newVendor]);
      }
      handleClose();
    } catch (error) {
      console.error("Error saving vendor:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteDialog = (vendor) => {
    setVendorToDelete(vendor);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setVendorToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!vendorToDelete) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/vendors/${vendorToDelete.id}`);
      setVendors(vendors.filter((v) => v.id !== vendorToDelete.id));
    } catch (error) {
      console.error("Error deleting vendor:", error);
    } finally {
      setDeleting(false);
      handleCloseDeleteDialog();
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Manage Vendors
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">Vendor List</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Vendor
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
          <VendorSkeleton />
        </Box>
      ) : (
        <Card>
          <CardContent>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <b>Name</b>
                  </TableCell>
                  <TableCell>
                    <b>Email</b>
                  </TableCell>
                  <TableCell>
                    <b>Phone</b>
                  </TableCell>
                  <TableCell>
                    <b>Category</b>
                  </TableCell>
                  <TableCell align="center">
                    <b>Actions</b>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vendors.map((vend) => (
                  <TableRow key={vend.id}>
                    <TableCell>{vend.name}</TableCell>
                    <TableCell>{vend.email}</TableCell>
                    <TableCell>{vend.phone}</TableCell>
                    <TableCell>{vend.category}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit Vendor">
                        <IconButton onClick={() => handleOpen(vend)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Vendor">
                        <IconButton
                          color="error"
                          onClick={() => handleOpenDeleteDialog(vend)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{editVendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
        <DialogContent>
          <TextField
            label="Vendor Name"
            name="name"
            fullWidth
            margin="normal"
            value={form.name}
            onChange={handleChange}
          />
          <TextField
            label="Email"
            name="email"
            fullWidth
            margin="normal"
            value={form.email}
            onChange={handleChange}
          />
          <TextField
            label="Phone"
            name="phone"
            fullWidth
            margin="normal"
            value={form.phone}
            onChange={handleChange}
          />

          {/* Dropdown for category */}
          <FormControl fullWidth margin="normal">
            <InputLabel>Category</InputLabel>
            <Select
              name="category"
              value={form.category}
              onChange={handleChange}
              label="Category"
            >
              {vendorCategories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? (
              <CircularProgress size={22} sx={{ color: "#fff" }} />
            ) : editVendor ? (
              "Update"
            ) : (
              "Save"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <b>{vendorToDelete?.name}</b>?
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deleting}
          >
            {deleting ? (
              <CircularProgress size={22} sx={{ color: "#fff" }} />
            ) : (
              "Delete"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
