import React, { useState, useEffect } from "react";
import { Table, Form } from "react-bootstrap";
import "./SurgerySchedule.css"; // Import custom styles
import * as XLSX from "xlsx";
import crea_logo from "../assets/images/FINAL_CREA_.png";
import { io } from "socket.io-client";
import { cardData, nextScheduledData } from "../utils/cardDetails";
//const socket = io("http://localhost:5000"); // Connect to backend
import socket from "../Socket";
//const socket = io("http://192.168.0.113:5000"); // Connect to backend

const getStatusColor = (status) => {
  switch (status) {
    case "SCHEDULED":
      return "blue";
    case "WAITING":
      return "orange";
    case "DELAYED":
      return "red";
    case "WHEEL IN":
      return "green";
    case "IN PROGRESS":
      return "yellow";
    default:
      return "gray";
  }
};

const getStatus = (scheduledDatetime, wheelIn, status) => {
  //console.log("status value is ", status);
  //console.log("scheduled timevalue", scheduledTime);
  //console.log("wheelin value", wheelIn);
  const currentTime = new Date();
  //const [hours, minutes] = scheduledTime.split(":").map(Number);

  // Create scheduled date with no milliseconds
  const scheduledDate = new Date(scheduledDatetime); // Convert full datetime string to Date object
  //scheduledDate.setHours(hours, minutes, 0, 0); // Ensure no extra seconds/milliseconds
  scheduledDate.setMilliseconds(0);

  const fiveMinutesAfter = new Date(scheduledDate.getTime() + 5 * 60000);
  fiveMinutesAfter.setMilliseconds(0);

  //console.log("wheelin value", wheelIn);

  if (wheelIn && status != "IN PROGRESS") {
    return "WHEEL IN";
  }

  if (status === "Wheel Out") {
    return "Wheel Out";
  }

  if (status === "IN PROGRESS") {
    return "IN PROGRESS";
  }

  if (currentTime < scheduledDate) {
    return "SCHEDULED";
  } else if (currentTime >= scheduledDate && currentTime <= fiveMinutesAfter) {
    return "WAITING";
  } else if (currentTime > fiveMinutesAfter && !wheelIn) {
    return "DELAYED";
  } else if (wheelIn) {
    //console.log("inside wheelin true block");
    return "WHEEL IN";
  }
};

const speakText = (text) => {
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US"; // Set language (change if needed)
    utterance.rate = 1; // Adjust speed (0.1 - 2)
    speechSynthesis.speak(utterance);
  } else {
    console.warn("Speech synthesis is not supported in this browser.");
  }
};

const SurgerySchedule = ({ otCardData }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sampleData, setSampleData] = useState([]);

  // Load data from localStorage on component mount
  useEffect(() => {
    const storedData = localStorage.getItem("otSampleData");
    if (storedData) {
      setSampleData(JSON.parse(storedData));
    }
  }, []);

  useEffect(() => {
    if (otCardData && otCardData.status) {
      console.log("Received otCardData:", otCardData);

      // Extract OT number from message (e.g., 'OT-7' → '7')
      //const extractedOtNo = otCardData.status.replace("OT-", "").trim();
      const extractedOtNo = otCardData.otId;

      setSampleData((prevData) => {
        console.log("prevData value", prevData);
        const updatedData = prevData.map((item) => {
          const itemDateTime = new Date(item.datetime);
          const currentTime = new Date();

          if (
            item.otNo.toString() === extractedOtNo &&
            itemDateTime < currentTime
          ) {
            console.log("Updating status for OT:", extractedOtNo);
            return {
              ...item,
              status: otCardData.status,
              wheelIn: otCardData.status === "Wheel In" ? true : false,
            };
          }
          return item;
        });

        console.log("Updated Sample Data:", updatedData); // Debugging: Check updated data
        localStorage.setItem("otSampleData", JSON.stringify(updatedData)); // Persist changes
        speakText(
          `Status of OT No ${extractedOtNo} is moved to ${otCardData.status}`
        );
        return updatedData;
      });

      const timeoutDuration =
        otCardData.status === "Wheel In" ? 1 * 60 * 1000 : 5 * 60 * 1000; // 1 min for "Wheel In", 5 min for "Wheel Out"
      console.log("timeutDurationvalue", timeoutDuration);

      // **Schedule Status Change to "IN PROGRESS" after 5 minutes**
      setTimeout(() => {
        console.log("came to set timeout logic..");
        setSampleData((prevData) => {
          let sts;
          if (otCardData.status === "Wheel In") {
            sts = "IN PROGRESS";
          } else if (otCardData.status === "Wheel Out") {
            sts = otCardData.status;
          }
          const updatedData = prevData.map((item) => {
            const itemDateTime = new Date(item.datetime);
            const currentTime = new Date();
            if (
              item.otNo.toString() === extractedOtNo &&
              itemDateTime < currentTime
            ) {
              console.log(`Changing OT-${extractedOtNo} status to ${sts}`);
              return { ...item, status: sts };
            }
            return item;
          });

          console.log("Updated Sample Data after 1 min:", updatedData);
          localStorage.setItem("otSampleData", JSON.stringify(updatedData)); // Persist changes
          speakText(`Status of OT No ${extractedOtNo} is moved to ${sts}`);
          const sampleData = {
            status: sts,
            timestamp: Date.now(),
            otId: extractedOtNo,
          };
          console.log("Pushing on Inprogress status", sampleData);
          //socket.emit("push-data", sampleData);
          let filteredCase =
            sts === "IN PROGRESS"
              ? cardData(extractedOtNo, sts)
              : nextScheduledData(extractedOtNo);
          //let nextScheduledCase = nextScheduledData(extractedOtNo);
          //console.log("next scheduled data::", nextScheduledCase);
          socket.emit("push-data", {
            otId: filteredCase.otNo,
            ...filteredCase,
          });
          return updatedData;
        });
      }, 1 * 60 * 1000); // **5 minutes delay**
    }
  }, [otCardData]); // Run whenever otCardData updates

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const excelSerialToJSDate = (serial) => {
    const utc_days = Math.floor(serial - 25569); // Excel date starts from 1900-01-01
    const utc_value = utc_days * 86400000; // Convert days to milliseconds
    const date_info = new Date(utc_value); // Create Date object
    const fractional_day = serial - Math.floor(serial);
    const total_seconds = Math.floor(86400 * fractional_day);
    const hours = Math.floor(total_seconds / 3600);
    const minutes = Math.floor((total_seconds - hours * 3600) / 60);
    const seconds = total_seconds - hours * 3600 - minutes * 60;

    return `${date_info.getFullYear()}-${(date_info.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${date_info
      .getDate()
      .toString()
      .padStart(2, "0")} ${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const parsedData = XLSX.utils.sheet_to_json(sheet);

      const formattedData = parsedData.map((row, index) => ({
        datetime: excelSerialToJSDate(row["DateTime"]) || "",
        caseId: row["CaseId"] || "",
        procedure: row["Procedure name"] || "",
        surgeon: row["Surgeon Name"] || "",
        patient: row["Patient Details"] || "",
        otNo: row["OT No"] || "",
        status: row["Status"] || "",
        wheelIn: false,
      }));

      localStorage.setItem("otSampleData", JSON.stringify(formattedData));
      setSampleData(formattedData);

      // Track pushed OT Nos to prevent duplicates
      const pushedOtNos = new Set();

      // Push each OT entry to the WebSocket server
      formattedData.forEach((data) => {
        if (!pushedOtNos.has(data.otNo)) {
          pushedOtNos.add(data.otNo);
          console.log("pushing data of each...");
          const status = getStatus(data.datetime, data.wheelIn, data.status);
          data.status = status;
          socket.emit("push-data", { otId: data.otNo, ...data });
        }
      });
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="table-container">
      <Form.Group controlId="fileUpload" className="mb-3">
        <Form.Control
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
        />
      </Form.Group>
      <div className="table-header">
        <img
          className=""
          src={crea_logo}
          style={{ width: "10%", height: "1%" }}
          alt="Crea Logo"
        />
        <h3>SURGERY SCHEDULE</h3>
        <h3>{currentTime.toLocaleTimeString()}</h3>
      </div>

      <table
        className="custom-table"
        borderless={true}
        striped={false}
        hover={false}
        responsive={true}
      >
        <thead>
          <tr>
            <th>Datetime</th>
            <th>Case Id</th>
            <th>Procedure</th>
            <th>Surgeon</th>
            <th>Patient</th>
            <th>Ot No</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sampleData.map((item) => {
            const status = getStatus(item.datetime, item.wheelIn, item.status);
            return (
              <tr>
                <td>{item.datetime}</td>
                <td>{item.caseId}</td>
                <td>{item.procedure}</td>
                <td>{item.surgeon}</td>
                <td>{item.patient}</td>
                <td>{item.otNo}</td>
                <td>
                  {status}{" "}
                  <span
                    className={`status-indicator ${
                      status === "IN PROGRESS" ? "blink" : ""
                    }`}
                    style={{ backgroundColor: getStatusColor(status) }}
                  ></span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SurgerySchedule;
