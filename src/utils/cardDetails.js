export const cardData = (cameraId, status) => {
  console.log("reached card details page");
  const storedData = localStorage.getItem("otSampleData");
  let filteredCase = null; // Declare outside the if block
  if (storedData) {
    const casesArray = JSON.parse(storedData);
    console.log("casearray data", casesArray);
    // Find the case with the given otNo
    filteredCase = casesArray.find((item) => item.otNo === Number(cameraId));

    console.log("filered case details", filteredCase);
  }

  filteredCase.status = status;
  return filteredCase;
};

export const nextScheduledData = (otId) => {
  console.log("Reached next schedule card details page");
  const storedData = localStorage.getItem("otSampleData");

  if (!storedData) return null;

  const casesArray = JSON.parse(storedData);
  console.log("Case array data:", casesArray);

  // Get the current time
  const currentTime = new Date();

  console.log("currentTime value", currentTime);

  // Filter cases by otNo and status being "Scheduled" and datetime in the future
  const upcomingCases = casesArray
    .filter(
      (item) =>
        item.otNo === Number(otId) &&
        //item.status === "Scheduled" &&
        new Date(item.datetime) > currentTime
    )
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime)); // Sort by nearest date

  console.log("Filtered upcoming cases:", upcomingCases);

  // Return the next scheduled case (first item in sorted array) or null if not found
  return upcomingCases.length > 0 ? upcomingCases[0] : null;
};
