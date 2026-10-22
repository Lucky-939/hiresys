
async function verify() {
  // Login to get token
  const loginRes = await fetch("http://localhost:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@company.com", password: "password123" }) // Usually seeded
  });
  
  if (!loginRes.ok) {
    console.error("Login failed", await loginRes.text());
    return;
  }
  const { token } = (await loginRes.json()) as any;
  console.log("Got token:", token.substring(0, 10) + "...");
  
  const headers = {
    "Authorization": `Bearer ${token}`
  };

  const orgsRes = await fetch("http://localhost:5000/api/organizations/mine", { headers });
  const orgs = await orgsRes.json();
  const orgId = orgs.data?.[0]?.id;
  if (!orgId) {
    console.log("No org found for user.");
    return;
  }
  console.log("Using Org ID:", orgId);
  
  console.log("\n1. Fetching dashboard stats...");
  const statsRes = await fetch(`http://localhost:5000/api/dashboard?orgId=${orgId}`, { headers });
  const stats = await statsRes.json();
  console.log(JSON.stringify(stats, null, 2));
  
  console.log("\n2. Fetching candidates...");
  const candidatesRes = await fetch(`http://localhost:5000/api/candidates?orgId=${orgId}`, { headers });
  const candidatesList = await candidatesRes.json();
  const firstCandidate = candidatesList.data?.[0];
  
  if (firstCandidate) {
    console.log(`\n3. Fetching single candidate ${firstCandidate.id}...`);
    const candidateRes = await fetch(`http://localhost:5000/api/candidates/${firstCandidate.id}?orgId=${orgId}`, { headers });
    const candidate = await candidateRes.json();
    console.log(JSON.stringify(candidate, null, 2));
  } else {
    console.log("No candidates found to fetch details for.");
  }
}

verify().catch(console.error);
