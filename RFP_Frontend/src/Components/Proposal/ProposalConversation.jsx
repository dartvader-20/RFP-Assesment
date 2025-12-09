import React, { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Typography,
  Divider,
  Paper,
  Button,
} from "@mui/material";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import MessageBubble from "./MessageBubble";
import ProposalComparisonDialog from "./ProposalComparisonDialog";

const ProposalConversation = ({ proposalId }) => {
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [compareOpen, setCompareOpen] = useState(false);
  useEffect(() => {
    const fetchProposal = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/proposals/${proposalId}`
        );
        setProposal(res.data);
      } catch (err) {
        console.error("Failed to load proposal conversation:", err);
      } finally {
        setLoading(false);
      }
    };

    if (proposalId) fetchProposal();
  }, [proposalId]);

  if (loading)
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <CircularProgress />
      </Box>
    );

  if (!proposal)
    return (
      <Box textAlign="center" mt={5}>
        <Typography variant="h6" color="error">
          Proposal not found
        </Typography>
      </Box>
    );

  // rfp structured JSON from the proposal (support either field)
  const rfpSummary =
    proposal?.rfp?.structured || proposal?.structuredJson || null;

  return (
    <Box p={2}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Vendor: {proposal.vendor?.name}</Typography>
        <Typography variant="body2" color="textSecondary">
          Status: {proposal.status}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setCompareOpen(true)}
        >
          Compare Proposals
        </Button>
      </Paper>

      <Divider sx={{ mb: 2 }} />

      {/* Messages */}
      <Box
        sx={{
          height: "75vh",
          overflowY: "auto",
          pr: 1,
        }}
      >
        {!proposal.messages || proposal.messages.length === 0 ? (
          <Typography color="textSecondary">No conversation yet.</Typography>
        ) : (
          proposal.messages.map((msg) => {
            // For BUYER messages, pass the rfpSummary so MessageBubble renders the nice quotation
            const enriched =
              msg.sender === "BUYER" ? { ...msg, rfpSummary } : msg;
            return <MessageBubble key={msg.messageId} message={enriched} />;
          })
        )}
      </Box>
      <ProposalComparisonDialog
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        rfpId={proposal.rfpId}
      />
    </Box>
  );
};

export default ProposalConversation;
