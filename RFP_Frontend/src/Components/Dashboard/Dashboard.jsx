import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Typography,
  Box,
  Paper,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import DescriptionIcon from "@mui/icons-material/Description";
import PeopleIcon from "@mui/icons-material/People";
import MailIcon from "@mui/icons-material/Mail";
import axios from "axios";

export default function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    total: 0,
    OPEN: 0,
    IN_REVIEW: 0,
    CLOSED: 0,
  });

  const [loading, setLoading] = useState(true);

  const cards = [
    {
      key: "create",
      title: "RFP Manager",
      desc: "Create, edit and manage RFPs with full automation.",
      icon: <DescriptionIcon sx={{ fontSize: 40 }} />,
      action: "Open",
      path: "/create-rfp",
    },
    {
      key: "vendor",
      title: "Manage Vendors",
      desc: "Add or categorize vendors and maintain vendor database.",
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      action: "Manage",
      path: "/vendors",
    },
    {
      key: "proposal",
      title: "Proposals Inbox",
      desc: "View and review vendor proposals from your inbox.",
      icon: <MailIcon sx={{ fontSize: 40 }} />,
      action: "Review",
      path: "/proposals",
    },
  ];

  // FETCH RFP STATS
  useEffect(() => {
    const fetchRfps = async () => {
      try {
        const res = await axios.get(
          "http://localhost:4000/api/rfps?userId=12345"
        );

        const rfps = res.data || [];

        const statsCount = {
          total: rfps.length,
          OPEN: 0,
          IN_REVIEW: 0,
          CLOSED: 0,
        };

        rfps.forEach((rfp) => {
          if (statsCount[rfp.status] !== undefined) {
            statsCount[rfp.status]++;
          }
        });

        setStats(statsCount);
      } catch (error) {
        console.error("Error fetching RFP stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRfps();
  }, []);

  return (
    <Box sx={{ backgroundColor: "#f5f7fa", minHeight: "100vh" }}>
      {/* HERO SECTION */}
      <Box sx={{ background: "#1e293b", color: "white", py: 6, px: 4 }}>
        <Typography variant="h4" fontWeight={700}>
          RFP Automation Dashboard
        </Typography>
        <Typography variant="subtitle1" sx={{ opacity: 0.8, mt: 1 }}>
          Manage RFPs, Vendors, and Proposals effortlessly.
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 1600, mx: "auto", mt: -4, px: 3 }}>
        {/* QUICK STATS SECTION */}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={6} sm={3}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  textAlign: "center",
                  background: "white",
                }}
              >
                <Typography variant="h5" fontWeight={700}>
                  {stats.total}
                </Typography>
                <Typography color="text.secondary">Total RFPs</Typography>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Paper
                elevation={3}
                sx={{ p: 3, borderRadius: 3, textAlign: "center" }}
              >
                <Typography variant="h5" fontWeight={700}>
                  {stats.OPEN}
                </Typography>
                <Typography color="text.secondary">Open</Typography>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Paper
                elevation={3}
                sx={{ p: 3, borderRadius: 3, textAlign: "center" }}
              >
                <Typography variant="h5" fontWeight={700}>
                  {stats.IN_REVIEW}
                </Typography>
                <Typography color="text.secondary">In Review</Typography>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Paper
                elevation={3}
                sx={{ p: 3, borderRadius: 3, textAlign: "center" }}
              >
                <Typography variant="h5" fontWeight={700}>
                  {stats.CLOSED}
                </Typography>
                <Typography color="text.secondary">Closed</Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* FEATURE CARDS SECTION */}
        <Grid container spacing={4} sx={{ mt: 6, mb: 6 }}>
          {cards.map((c) => (
            <Grid key={c.key} item xs={12} sm={4} md={4} lg={4} xl={4}>
              <Card
                elevation={4}
                sx={{
                  borderRadius: 3,
                  minHeight: 240,
                  display: "flex",
                  flexDirection: "column",
                  p: 1,
                  transition: "0.2s",
                  "&:hover": { transform: "translateY(-6px)", boxShadow: 8 },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ mb: 2 }}>{c.icon}</Box>
                  <Typography variant="h6" fontWeight={600}>
                    {c.title}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    {c.desc}
                  </Typography>
                </CardContent>

                <CardActions>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate(c.path)}
                  >
                    {c.action}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
      {/* FOOTER / ABOUT SECTION */}
      <Box
        sx={{
          mt: 8,
          py: 4,
          px: 3,
          textAlign: "center",
          color: "text.secondary",
        }}
      >
        <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
          About This Application
        </Typography>

        <Typography sx={{ maxWidth: 900, mx: "auto", lineHeight: 1.6 }}>
          This RFP Automation System helps simplify procurement workflows by
          allowing teams to create RFPs, collaborate with vendors, automate
          proposal collection, and review submissions from a centralized
          dashboard. Designed to save time, reduce manual effort, and improve
          vendor communication, the platform ensures a smooth and organized
          procurement experience.
        </Typography>

        <Typography sx={{ mt: 2, fontSize: "0.85rem", opacity: 0.6 }}>
          © {new Date().getFullYear()} RFP Automation System — All rights
          reserved.
        </Typography>
      </Box>
    </Box>
  );
}
