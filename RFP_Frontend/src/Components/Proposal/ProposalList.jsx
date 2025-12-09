import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
} from "@mui/material";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import ProposalConversation from "./ProposalConversation";

export default function ProposalList() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    loadAllSentProposals();
  }, []);

  const loadAllSentProposals = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/proposals`);
      setProposals(res.data || []);
    } catch (err) {
      console.error("Failed to load proposals:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", height: "100%", p: 2, gap: 2 }}>
      {/* LEFT SIDEBAR */}
      <Paper
        sx={{
          width: "280px",
          p: 2,
          height: "85vh",
          overflowY: "auto",
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Sent Proposals
        </Typography>
        <List>
          {proposals.map((proposal, index) => (
            <ListItem disablePadding key={proposal.proposalId}>
              <ListItemButton
                selected={selectedIndex === index}
                onClick={() => setSelectedIndex(index)}
                sx={{ borderRadius: 1 }}
              >
                <ListItemText
                  primary={proposal.vendor.name}
                  secondary={
                    <span>
                      {proposal.vendor.vendorType}{" "}
                      {proposal.score && (
                        <Chip
                          label={`Score: ${proposal.score}`}
                          size="small"
                          color="primary"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </span>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* RIGHT SIDEBAR */}
      <Box sx={{ flex: 1 }}>
        {proposals[selectedIndex] && (
          <ProposalConversation
            proposalId={proposals[selectedIndex].proposalId}
          />
        )}
      </Box>
    </Box>
  );
}
