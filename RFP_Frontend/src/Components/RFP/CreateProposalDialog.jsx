import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Checkbox,
  Paper,
  Divider,
  CircularProgress,
  Chip,
  Alert,
  Snackbar,
} from "@mui/material";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import { useNavigate } from "react-router-dom";

export default function CreateProposalDialog({ open, onClose, rfp, rfpId }) {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  useEffect(() => {
    if (!open) return;

    setSelectedVendors([]);
    const fetchVendors = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE_URL}/api/vendors`);
        const list = res?.data?.vendors || res?.data || [];
        setVendors(list);
      } catch (err) {
        console.error("Failed to fetch vendors:", err);
        setVendors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, [open]);

  const toggleVendor = (vendorId) => {
    setSelectedVendors((prev) =>
      prev.includes(vendorId)
        ? prev.filter((id) => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const findVendorIdsByNames = (names = []) => {
    if (!Array.isArray(names) || names.length === 0) return [];
    const normalized = names.map((n) =>
      (n || "").toString().trim().toLowerCase()
    );
    const matchedIds = [];

    vendors.forEach((v) => {
      const vn = (v.name || "").toString().trim().toLowerCase();
      if (normalized.includes(vn)) {
        matchedIds.push(v.vendorId ?? v.id);
      }
    });

    return matchedIds;
  };

  const selectSuggested = (suggestion) => {
    const names = suggestion?.vendorNames || [];
    const matchedIds = findVendorIdsByNames(names);

    if (!matchedIds.length) {
      window.alert(
        `No vendors from your vendor list matched the suggested names:\n\n${names.join(
          ", "
        )}\n\nYou can select vendors manually on the left.`
      );
      return;
    }

    setSelectedVendors((prev) => Array.from(new Set([...prev, ...matchedIds])));
  };

  const handleSendProposal = async () => {
    if (selectedVendors.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select at least 1 vendor.",
        severity: "error",
      });
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/api/email/draft`, {
        rfpId,
        vendorIds: selectedVendors,
      });

      onClose();

      // Navigate to Proposal screen with draft
      navigate(`/proposals/${rfpId}`, {
        state: {
          vendorIds: selectedVendors,
          draft: res.data.draft, // pass the actual draft object
        },
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to load draft email.",
        severity: "error",
      });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ fontWeight: 700, fontSize: 20 }}>
        Send Proposal to Vendors
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              gap: 3,
              flexDirection: { xs: "column", md: "row" },
            }}
          >
            {/* LEFT SIDE → VENDORS */}
            <Paper
              sx={{
                flex: 1,
                p: 2,
                borderRadius: 3,
                border: "1px solid #e5e7eb",
                maxHeight: 500,
                overflowY: "auto",
                bgcolor: "#f8fafc",
              }}
            >
              <Typography sx={{ fontWeight: 700, mb: 2, fontSize: 16 }}>
                Select Vendors
              </Typography>

              {vendors.length === 0 ? (
                <Typography>No vendors found.</Typography>
              ) : (
                vendors.map((v) => {
                  const vid = v.vendorId ?? v.id;
                  const checked = selectedVendors.includes(vid);
                  return (
                    <Box
                      key={vid}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        mb: 1,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: checked ? "#e0e7ff" : "#fff",
                        border: "1px solid #cbd5e1",
                        boxShadow: checked
                          ? "0 2px 6px rgba(79,70,229,0.2)"
                          : "0 1px 2px rgba(0,0,0,0.05)",
                        transition: "all 0.2s",
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: "#e0e7ff",
                          boxShadow: "0 2px 6px rgba(79,70,229,0.2)",
                        },
                      }}
                      onClick={() => toggleVendor(vid)}
                    >
                      <Checkbox checked={checked} />
                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>
                          {v.name}
                        </Typography>
                        <Typography sx={{ fontSize: 13, color: "#64748b" }}>
                          {v.vendorType} • {v.email}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Paper>

            {/* RIGHT SIDE → FINAL RFP SUMMARY */}
            <Paper
              sx={{
                flex: 1,
                p: 2,
                borderRadius: 3,
                border: "1px solid #e5e7eb",
                maxHeight: 500,
                overflowY: "auto",
                bgcolor: "#f9fafb",
              }}
            >
              <Typography sx={{ fontWeight: 700, mb: 2, fontSize: 16 }}>
                Final RFP Summary
              </Typography>

              {!rfp ? (
                <Typography>No summary available.</Typography>
              ) : (
                <>
                  <Typography>
                    <b>Title:</b> {rfp.title}
                  </Typography>
                  <Typography>
                    <b>Description:</b> {rfp.description}
                  </Typography>
                  <Typography>
                    <b>Budget:</b> ${rfp.budget}
                  </Typography>
                  <Typography>
                    <b>Delivery Days:</b> {rfp.deliveryDays}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Typography sx={{ fontWeight: 600 }}>Items:</Typography>
                  {rfp.items?.map((it, idx) => (
                    <Box key={idx} sx={{ mt: 1 }}>
                      <Typography>
                        - {it.name} (x{it.quantity})
                      </Typography>
                    </Box>
                  ))}

                  <Divider sx={{ my: 2 }} />

                  <Typography sx={{ fontWeight: 600 }}>Terms:</Typography>
                  {rfp.terms?.map((t, i) => (
                    <Typography key={i}>• {t}</Typography>
                  ))}

                  <Divider sx={{ my: 2 }} />

                  <Typography sx={{ fontWeight: 600 }}>
                    Vendor Suggestions:
                  </Typography>

                  {!rfp.vendorSuggestions ||
                  rfp.vendorSuggestions.length === 0 ? (
                    <Typography>No vendor suggestions available.</Typography>
                  ) : (
                    rfp.vendorSuggestions.map((vs, i) => {
                      const vendorNames = vs.vendorNames || [];
                      const matchedIds = findVendorIdsByNames(vendorNames);

                      return (
                        <Paper
                          key={i}
                          sx={{
                            p: 2,
                            my: 1.5,
                            borderRadius: 3,
                            bgcolor: "#f0f4ff",
                            border: "1px solid #c7d2fe",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                            transition: "transform 0.2s, box-shadow 0.2s",
                            "&:hover": {
                              transform: "translateY(-3px)",
                              boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                            },
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "start",
                              gap: 2,
                              flexWrap: "wrap",
                            }}
                          >
                            <Box sx={{ flex: 1, minWidth: 200 }}>
                              <Typography
                                sx={{ fontWeight: 700, color: "#1e3a8a" }}
                              >
                                {vs.vendorType}
                              </Typography>
                              <Typography
                                sx={{ color: "#334155", mt: 0.5, fontSize: 13 }}
                              >
                                {vs.reason}
                              </Typography>

                              {vendorNames.length > 0 && (
                                <Box
                                  sx={{
                                    mt: 1.5,
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 1,
                                  }}
                                >
                                  {vendorNames.map((name, idx) => (
                                    <Chip
                                      key={idx}
                                      label={name}
                                      size="small"
                                      sx={{
                                        bgcolor: "#e0e7ff",
                                        color: "#1e40af",
                                        fontWeight: 500,
                                      }}
                                    />
                                  ))}
                                </Box>
                              )}
                            </Box>

                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 1.5,
                                alignItems: "flex-end",
                              }}
                            >
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => selectSuggested(vs)}
                                sx={{
                                  bgcolor: "#4f46e5",
                                  color: "#fff",
                                  fontWeight: 600,
                                  borderRadius: 2,
                                  px: 2.5,
                                  py: 0.8,
                                  textTransform: "none",
                                  boxShadow: "0 2px 6px rgba(79,70,229,0.3)",
                                  "&:hover": {
                                    bgcolor: "#4338ca",
                                    boxShadow: "0 4px 12px rgba(67,56,202,0.3)",
                                  },
                                }}
                              >
                                Select Suggested
                              </Button>

                              <Typography
                                sx={{
                                  fontSize: 12,
                                  color: matchedIds.length
                                    ? "#16a34a"
                                    : "#ef4444",
                                  fontWeight: 500,
                                  textAlign: "right",
                                }}
                              >
                                {matchedIds.length
                                  ? `${matchedIds.length} matched`
                                  : "No matches"}
                              </Typography>
                            </Box>
                          </Box>
                        </Paper>
                      );
                    })
                  )}
                </>
              )}
            </Paper>
          </Box>
        )}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
        </Snackbar>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          sx={{
            bgcolor: "#2563eb",
            "&:hover": { bgcolor: "#1e40af" },
            fontWeight: 600,
          }}
          onClick={handleSendProposal}
        >
          View Proposal
        </Button>
      </DialogActions>
    </Dialog>
  );
}
