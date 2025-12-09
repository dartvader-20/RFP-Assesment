// src/components/ProposalConversation/ProposalComparisonDialog.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  CircularProgress,
  Paper,
  Divider,
  Button,
  Snackbar,
  Alert,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import axios from "axios";
import { API_BASE_URL } from "../../config";

const ProposalComparisonDialog = ({ open, onClose, rfpId }) => {
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    if (!open) return;

    const fetchComparison = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE_URL}/api/proposals/compare`, {
          params: { rfpId },
        });
        setComparison(res.data);
      } catch (err) {
        console.error("Failed to load comparison:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [open, rfpId]);

  const getCardStyle = (index) => ({
    p: 3,
    mb: 3,
    borderRadius: 3,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    backgroundColor: index % 2 === 0 ? "#f9f9f9" : "#e3f2fd",
    transition: "transform 0.2s, box-shadow 0.2s",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
    },
  });

  const handleFinalize = async () => {
    if (!selectedProposal) return;

    const [proposalId, vendorId] = selectedProposal.split("::");

    try {
      setFinalizing(true);

      await axios.post(`${API_BASE_URL}/api/proposals/finalise`, {
        rfpId,
        proposalId: Number(proposalId),
        vendorId: Number(vendorId),
      });

      setSnackbar({
        open: true,
        message: "Vendor selected successfully!",
        severity: "success",
      });

      onClose();
    } catch (err) {
      console.error("Failed to finalize vendor:", err);
      setSnackbar({
        open: true,
        message: "Failed to select vendor.",
        severity: "error",
      });
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold", color: "#1976d2" }}>
          Proposal Comparison
        </DialogTitle>
        <DialogContent dividers>
          {loading ? (
            <Box display="flex" justifyContent="center" my={5}>
              <CircularProgress />
            </Box>
          ) : !comparison ? (
            <Typography sx={{ textAlign: "center", py: 5 }}>
              No comparison data available.
            </Typography>
          ) : (
            <Box>
              {/* ALL PROPOSALS */}
              <Typography
                variant="h5"
                gutterBottom
                sx={{ mt: 2, mb: 3, fontWeight: 600 }}
              >
                All Proposals
              </Typography>

              {comparison.proposals?.map((p, i) => (
                <Paper key={p.proposalId} sx={getCardStyle(i)}>
                  <Typography
                    variant="h6"
                    sx={{ mb: 1, fontWeight: 600, color: "#0d47a1" }}
                  >
                    {p.vendor.name} (Proposal #{p.proposalId})
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  {/* Vendor Details */}
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    <Typography>
                      <b>Email:</b> {p.vendor.email}
                    </Typography>
                    <Typography>
                      <b>Vendor ID:</b> {p.vendor.vendorId}
                    </Typography>
                    <Typography>
                      <b>Budget:</b> {p.structuredProposal?.budget}
                    </Typography>
                    <Typography>
                      <b>Delivery Days:</b> {p.structuredProposal?.deliveryDays}
                    </Typography>
                  </Box>

                  {/* Structured Proposal */}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {p.structuredProposal?.title}
                    </Typography>
                    <Typography sx={{ mb: 1 }}>
                      {p.structuredProposal?.description}
                    </Typography>

                    {/* Items */}
                    <Typography
                      variant="subtitle2"
                      sx={{ mt: 2, fontWeight: 600 }}
                    >
                      Items:
                    </Typography>
                    <Box component="ul" sx={{ pl: 3, mb: 1 }}>
                      {p.structuredProposal?.items?.map((item, idx) => (
                        <li key={idx}>
                          <b>{item.name}</b> — Qty: {item.quantity} <br />
                          Specs: {JSON.stringify(item.specifications)}
                        </li>
                      ))}
                    </Box>

                    {/* Terms */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Terms:
                    </Typography>
                    <Box component="ul" sx={{ pl: 3, mb: 1 }}>
                      {p.structuredProposal?.terms?.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </Box>

                    {/* Summary */}
                    <Typography
                      sx={{ mt: 2, fontStyle: "italic", color: "#555" }}
                    >
                      {p.structuredProposal?.vendorQuoteSummary}
                    </Typography>
                  </Box>
                </Paper>
              ))}

              {/* AI INSIGHTS */}
              <Typography
                variant="h5"
                gutterBottom
                sx={{ mt: 4, mb: 2, fontWeight: 600 }}
              >
                AI Vendor Insights
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={2}>
                {comparison.aiComparison?.proposalInsights?.map(
                  (vendor, idx) => (
                    <Paper
                      key={idx}
                      sx={{
                        flex: "1 1 300px",
                        p: 2,
                        borderRadius: 2,
                        boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
                        backgroundColor: "#fff3e0",
                      }}
                    >
                      <Typography variant="h6" sx={{ color: "#e65100" }}>
                        {vendor.vendorName}
                      </Typography>
                      <Divider sx={{ my: 1 }} />

                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Strengths:
                      </Typography>
                      <Box component="ul" sx={{ pl: 2 }}>
                        {vendor.strengths?.length ? (
                          vendor.strengths.map((s, i) => <li key={i}>{s}</li>)
                        ) : (
                          <li>No strengths listed</li>
                        )}
                      </Box>

                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Weaknesses:
                      </Typography>
                      <Box component="ul" sx={{ pl: 2 }}>
                        {vendor.weaknesses?.length ? (
                          vendor.weaknesses.map((w, i) => <li key={i}>{w}</li>)
                        ) : (
                          <li>No weaknesses listed</li>
                        )}
                      </Box>

                      <Typography sx={{ mt: 1, fontStyle: "italic" }}>
                        {vendor.summary}
                      </Typography>
                    </Paper>
                  )
                )}
              </Box>

              {/* AI Comparison Summary */}
              <Typography
                variant="h5"
                gutterBottom
                sx={{ mt: 4, mb: 2, fontWeight: 600 }}
              >
                AI Comparison Summary
              </Typography>
              <Paper
                sx={{
                  p: 3,
                  mb: 4,
                  backgroundColor: "#e8f5e9",
                  borderRadius: 2,
                }}
              >
                <Typography>
                  <b>Budget:</b>{" "}
                  {comparison.aiComparison.comparisonSummary?.budgetComparison}
                </Typography>
                <Typography>
                  <b>Delivery:</b>{" "}
                  {
                    comparison.aiComparison.comparisonSummary
                      ?.deliveryComparison
                  }
                </Typography>
                <Typography>
                  <b>Specs:</b>{" "}
                  {comparison.aiComparison.comparisonSummary?.specComparison}
                </Typography>
              </Paper>

              {/* AI Recommendation */}
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                AI Recommended Proposal
              </Typography>
              <Paper sx={{ p: 3, backgroundColor: "#e3f2fd", borderRadius: 2 }}>
                <Typography variant="h5" color="primary" sx={{ mb: 1 }}>
                  {comparison.aiComparison.recommendedProposal?.vendorName}
                </Typography>
                <Typography sx={{ fontStyle: "italic" }}>
                  {comparison.aiComparison.recommendedProposal?.reason}
                </Typography>
              </Paper>

              {/* VENDOR SELECTION SECTION */}
              <Box mt={4} mb={4}>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                  Select Vendor to Finalize
                </Typography>

                <FormControl component="fieldset">
                  <RadioGroup
                    value={selectedProposal || ""}
                    onChange={(e) => setSelectedProposal(e.target.value)}
                  >
                    {comparison.proposals?.map((p) => (
                      <FormControlLabel
                        key={p.proposalId}
                        value={`${p.proposalId}::${p.vendor.vendorId}`}
                        control={<Radio />}
                        label={`${p.vendor.name} (Proposal #${p.proposalId})`}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>

                <Box mt={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleFinalize}
                    disabled={finalizing || !selectedProposal}
                  >
                    {finalizing ? "Finalizing..." : "Finalize Vendor"}
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ProposalComparisonDialog;
