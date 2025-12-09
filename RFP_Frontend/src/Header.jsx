import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { Link } from "react-router-dom";

export default function Header() {
  return (
    <AppBar position="fixed" sx={{ bgcolor: "#1e3a8a", mb: 2 }}>
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        {/* Logo / Branding */}
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          RFP Management
        </Typography>

        {/* Navigation Menu */}
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button color="inherit" component={Link} to="/">
            Dashboard
          </Button>
          <Button color="inherit" component={Link} to="/create-rfp">
            RFP Manager
          </Button>
          <Button color="inherit" component={Link} to="/proposals">
            Proposal Manager
          </Button>
          <Button color="inherit" component={Link} to="/vendors">
            Vendors Manager
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
