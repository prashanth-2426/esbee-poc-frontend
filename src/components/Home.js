import { useState, useEffect, useRef } from "react";
import {
  Form,
  Table,
  Container,
  Row,
  Col,
  Card,
  Button,
} from "react-bootstrap";
import { Clock } from "lucide-react";
import { TbBackground } from "react-icons/tb";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

import SurgerySchedule from "./SurgerySchedule";
import { io } from "socket.io-client";
import { cardData } from "../utils/cardDetails";
//const socket = io("http://localhost:5000"); // Connect to backend
const socket = io("http://192.168.0.113:5000"); // Connect to backend

export default function Home() {
  const [selectedTheater, setSelectedTheater] = useState("Theater 1");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [responseData, setResponseData] = useState(null); // State to store API response

  const [otCardData, setOtCardData] = useState(null); // State to pass data to child
  const webcamRef = useRef(null);
  const usbCameraRef = useRef(null);
  const backendUrl = "http://127.0.0.1:5000/otfeed"; // Replace with your backend URL
  const backendUrlYoco = "http://127.0.0.1:5000/otfeed"; // Replace with your backend URL

  const commands = [
    {
      command: "Snapshot",
      callback: () => {
        console.log("Command detected: OT1 Take Snapshot");
        captureScreenshot(webcamRef, "OT1");
      },
    },
    {
      command: "OT2 Take Snapshot",
      callback: () => {
        console.log("Command detected: OT2 Take Snapshot");
        captureScreenshot(usbCameraRef, "OT2");
      },
    },
  ];

  const { transcript, listening, browserSupportsSpeechRecognition } =
    useSpeechRecognition({ commands });

  useEffect(() => {
    console.log("Transcript: ", transcript);
  }, [transcript]);

  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      console.error("Speech recognition not supported in this browser.");
    }
  }, [browserSupportsSpeechRecognition]);

  useEffect(() => {
    // Listen for data from the main peer
    socket.on("wheelinoutdata", (receivedData) => {
      console.log("Data received from server:", receivedData);
    });
    return () => {
      socket.off("wheelinoutdata"); // Cleanup listener on unmount
    };
  }, []);

  // Logic to capture a screenshot
  const captureScreenshot = (videoRef, cameraName) => {
    console.log("came to capturescreenshot method one", cameraName);
    console.log("came to capturescreenshot method two", videoRef);
    if (videoRef.current) {
      console.log("Capturing screenshot from: ", cameraName);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      // Convert canvas to image and save
      const dataURL = canvas.toDataURL("image/jpeg");
      const link = document.createElement("a");
      link.href = dataURL;
      link.download = `${cameraName}_screenshot.jpg`;
      link.click();

      console.log(`${cameraName} screenshot captured.`);
    }
  };

  // Start and stop voice recognition
  const toggleListening = () => {
    if (listening) {
      console.log("Stopping listening...");
      SpeechRecognition.stopListening();
    } else {
      console.log("Starting listening...");
      SpeechRecognition.startListening({ continuous: true, language: "en-IN" });
    }
  };

  useEffect(() => {
    // Access real-time webcam feed
    const startWebcamFeed = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (webcamRef.current) {
          webcamRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing webcam:", error);
      }
    };

    // Access external USB camera feed
    const startUsbCameraFeed = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput"
        );

        // Assuming the external USB camera is the second video device
        if (videoDevices.length > 1) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: videoDevices[1].deviceId },
          });
          if (usbCameraRef.current) {
            usbCameraRef.current.srcObject = stream;
          }
        } else {
          console.warn("External USB camera not found.");
        }
      } catch (error) {
        console.error("Error accessing USB camera:", error);
      }
    };

    startWebcamFeed();
    startUsbCameraFeed();

    // Clean up streams on unmount
    return () => {
      if (webcamRef.current?.srcObject) {
        const tracks = webcamRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
      if (usbCameraRef.current?.srcObject) {
        const tracks = usbCameraRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  const sendDataToOTCard = (cameraId) => {
    console.log("Sending data to OT Card");
    console.log("cameraid value", cameraId);

    const sampleData = {
      status: "Wheel In",
      timestamp: Date.now(),
      otId: cameraId,
    };
    console.log("sameple data value", sampleData);
    //socket.emit("push-data", sampleData);

    let filteredCase = cardData(cameraId, "Wheel In");
    socket.emit("push-data", { otId: filteredCase.otNo, ...filteredCase });

    // Update state so SurgerySchedule receives it
    setOtCardData(sampleData);
  };

  // Function to capture frames and send to backend
  const captureAndSendFrames = () => {
    const sendFrame = (videoRef, cameraId) => {
      if (videoRef.current) {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        // Convert canvas to base64 image
        const frameData = canvas.toDataURL("image/jpeg");

        // Send frame data to backend
        fetch(backendUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frame: frameData, cameraId }),
        })
          .then((response) => response.json())
          .then((data) => {
            // console.log(
            //   `Camera ${cameraId} frame sent successfully`,
            //   data.path.length
            // );

            setResponseData((prevData) => ({
              ...prevData,
              [cameraId]: data, // Store response separately for each camera
            }));
            if (data.path.length == 1) {
              //alert("Wheeled In - " + cameraId);
              sendDataToOTCard(cameraId);
            }
          })
          .catch((error) =>
            console.error(`Error sending frame from Camera ${cameraId}:`, error)
          );
      }
    };
    // Send frames from both cameras
    sendFrame(webcamRef, "7");
    sendFrame(usbCameraRef, "6");
  };

  const getCameraData = (cameraId) => {
    fetch(`${backendUrlYoco}?cameraId=${cameraId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(`Camera ${cameraId} data received:`, data);

        setResponseData((prevData) => ({
          ...prevData,
          [cameraId]: data, // Store response separately for each camera
        }));
      })
      .catch((error) =>
        console.error(`Error fetching data for Camera ${cameraId}:`, error)
      );
  };

  // Start sending frames every 5 seconds
  useEffect(() => {
    const interval = setInterval(captureAndSendFrames, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleTheaterChange = (event) => {
    setSelectedTheater(event.target.value);
  };
  return (
    <div className="bg-white min-h-screen flex flex-col">
      <main className="flex-grow p-4">
        <Container fluid className="mt-4">
          <Row className="justify-content-center">
            {/* Video Block 1 */}
            <Col xs={12} md={6} lg={6} className="mb-4">
              <Card>
                <Card.Body>
                  <div className="video-container">
                    <video
                      ref={webcamRef}
                      autoPlay
                      muted
                      playsInline
                      style={{
                        width: "100%",
                        height: "300px",
                        objectFit: "cover",
                      }}
                    ></video>
                  </div>
                </Card.Body>
                <Card.Footer className="text-center">
                  OT 7 Feed
                  <Button
                    variant={listening ? "danger" : "primary"}
                    onClick={toggleListening}
                    className="ms-3"
                  >
                    {listening ? "Stop Mic" : "Enable Mic"}
                  </Button>
                </Card.Footer>
              </Card>
            </Col>

            {/* Video Block 2 */}
            <Col xs={12} md={6} lg={6} className="mb-4">
              <Card>
                <Card.Body>
                  <div className="video-container">
                    <video
                      ref={usbCameraRef}
                      autoPlay
                      muted
                      playsInline
                      style={{
                        width: "100%",
                        height: "300px",
                        objectFit: "cover",
                      }}
                    ></video>
                  </div>
                </Card.Body>
                <Card.Footer className="text-center">
                  OT 6 Feed
                  <Button
                    variant={listening ? "danger" : "primary"}
                    onClick={toggleListening}
                    className="ms-3"
                  >
                    {listening ? "Stop Mic" : "Enable Mic"}
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          </Row>
        </Container>
        <SurgerySchedule otCardData={otCardData} />
      </main>

      <footer className="bg-gray-800 text-white p-4 text-center">
        <p>&copy; 2023 Operation Theater Monitor. All rights reserved.</p>
      </footer>
    </div>
  );
}
