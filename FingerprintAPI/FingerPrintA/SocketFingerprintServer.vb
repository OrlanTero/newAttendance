Imports System.Net.Sockets
Imports SocketIOClient
Imports Newtonsoft.Json
Imports Newtonsoft.Json.Linq
Imports System.Text.Json.Nodes
Imports System.Threading

' Convert from Module to Class to support multiple instances
Public Class SocketFingerprintServer
    Private SOCKET As SocketIOClient.SocketIO
    Private _biometric As Biometric
    Private ServerAddress As String = "127.0.0.1"
    Private ServerPort As Integer = 3005
    Private ReconnectTimer As Timer = Nothing
    Private _fingerprintData As String = ""
    Private _biometricConnected As Boolean = False
    Private _pendingVerification As Object = Nothing

    ' Method to create and start server instance
    Public Shared Function Start(serverAddress As String, port As Integer) As SocketFingerprintServer
        Dim server As New SocketFingerprintServer()
        server.StartServer(serverAddress, port)
        Return server
    End Function

    ' Instance method to start the server
    Private Sub StartServer(serverAddress As String, port As Integer)
        ServerAddress = serverAddress
        ServerPort = port
        
        Console.WriteLine($"Starting socket server connecting to {serverAddress}:{port}")

        ' Create socket connection with the provided server address and port
        Try
            SOCKET = New SocketIOClient.SocketIO($"http://{serverAddress}:{port}/")
            
            ' Configure reconnection options
            SOCKET.Options.ReconnectionAttempts = -1 ' Infinite reconnection attempts
            SOCKET.Options.ReconnectionDelay = 5000 ' 5 seconds between attempts

            ' Additional configuration may be available depending on your SocketIOClient version
            Console.WriteLine($"Socket options configured")

            ' Register events with safer approach using lambda expressions
            AddHandler SOCKET.OnConnected, Sub()
                                               SocketConnected()
                                           End Sub

            AddHandler SOCKET.OnDisconnected, Sub(s As Object, reason As String)
                                                  SocketDisconnected(reason)
                                              End Sub

            AddHandler SOCKET.OnError, Sub(s As Object, e As String)
                                           SocketError(e)
                                       End Sub

            AddHandler SOCKET.OnReconnectAttempt, Sub(s As Object, attempt As Integer)
                                                      SocketReconnectAttempt(attempt)
                                                  End Sub

            AddHandler SOCKET.OnReconnected, Sub()
                                                 SocketReconnected()
                                             End Sub

            StartBiometricService()

            SOCKET.ConnectAsync()
            Console.WriteLine($"Connection attempt initiated...")
        Catch ex As Exception
            Console.WriteLine($"Error setting up socket client: {ex.Message}")
            ' Set up reconnect timer
            If ReconnectTimer Is Nothing Then
                Console.WriteLine($"Setting up reconnect timer due to initialization error...")
                ReconnectTimer = New Timer(AddressOf TryReconnect, Nothing, 5000, 5000)
            End If
        End Try
    End Sub

    ' Socket event handlers
    Private Sub SocketConnected()
        Console.WriteLine($"Connected to Socket Server at {ServerAddress}:{ServerPort}!")

        ' Stop any reconnect timer
        If ReconnectTimer IsNot Nothing Then
            ReconnectTimer.Dispose()
            ReconnectTimer = Nothing
        End If

        OnConnected()

        ' If there's a pending verification, process it
        If _pendingVerification IsNot Nothing Then
            Console.WriteLine($"Processing pending verification after reconnect")
            Try
                Dim jsonString As String = _pendingVerification.ToString()
                ProcessVerification(jsonString)
            Catch ex As Exception
                Console.WriteLine($"Error processing pending verification: {ex.Message}")
            End Try
            _pendingVerification = Nothing
        End If
    End Sub

    Private Sub SocketDisconnected(reason As String)
        Console.WriteLine("Disconnected from Socket Server! Reason: " & If(String.IsNullOrEmpty(reason), "Unknown", reason))
        OnDisconnected()

        ' Set up auto-reconnect
        If ReconnectTimer Is Nothing Then
            Console.WriteLine($"Setting up reconnect timer...")
            ReconnectTimer = New Timer(AddressOf TryReconnect, Nothing, 5000, 5000)
        End If
    End Sub

    Private Sub SocketError(errorMsg As String)
        Console.WriteLine("Socket error: " & If(String.IsNullOrEmpty(errorMsg), "Unknown error", errorMsg))
    End Sub

    Private Sub SocketReconnectAttempt(attempt As Integer)
        Console.WriteLine("Reconnection attempt #" & attempt.ToString())
    End Sub

    Private Sub SocketReconnected()
        Console.WriteLine($"Socket reconnected successfully!")
    End Sub

    ' Try to reconnect to the socket server
    Private Sub TryReconnect(state As Object)
        If SOCKET.Connected Then
            If ReconnectTimer IsNot Nothing Then
                ReconnectTimer.Dispose()
                ReconnectTimer = Nothing
            End If
            Return
        End If

        Console.WriteLine($"Attempting to reconnect to socket server...")
        Try
            SOCKET.ConnectAsync()
        Catch ex As Exception
            Console.WriteLine($"Reconnect error: {ex.Message}")
        End Try
    End Sub

    Private Sub OnConnected()
        _biometricConnected = True
        Console.WriteLine("Connected to socket server - sending connection notification")
        SOCKET.EmitAsync("BIOMETRIC_CONNECTED", "")

        ' Send current device status
        Dim status As String = "idle"
        If _biometric IsNot Nothing Then
            status = "ready"
        End If
        SOCKET.EmitAsync("DEVICE_STATUS", status)

        Console.WriteLine("Connection notification sent")
    End Sub

    Private Sub OnDisconnected()
        _biometricConnected = False
        SOCKET.EmitAsync("BIOMETRIC_DISCONNECTED", "")
    End Sub

    Private Sub StartBiometricService()
        Console.WriteLine($"Setting up biometric service event handlers")

        Try
            ' Register socket events with lambda expressions
            SOCKET.On("START", Sub(response)
                                   Console.WriteLine("START command received")
                                   ResetBio()
                               End Sub)

            SOCKET.On("STOP", Sub(response)
                                  Console.WriteLine("STOP command received")
                                  StopBio()
                              End Sub)

            SOCKET.On("VERIFY_TEMPLATE", Sub(response)
                                             Console.WriteLine("VERIFY_TEMPLATE command received")
                                             VerifyBio(response)
                                         End Sub)

            SOCKET.On("PING", Sub(response)
                                  Console.WriteLine("PING command received")
                                  PingHandler(response)
                              End Sub)

            SOCKET.On("CHECK_STATUS", Sub(response)
                                          Console.WriteLine("CHECK_STATUS command received")
                                          StatusCheckHandler(response)
                                      End Sub)

            Console.WriteLine($"Event handlers setup complete")

            ' Initialize biometric device
            Console.WriteLine($"Initializing biometric device")
            ResetBio()
        Catch ex As Exception
            Console.WriteLine($"Error setting up biometric service: {ex.Message}")
        End Try
    End Sub

    Private Sub VerifyBio(data As SocketIOResponse)
        Try
            Console.WriteLine($"Received verification request")
            
            ' Save the raw data for debugging
            Dim jsonString As String = data.ToString()
            Console.WriteLine($"Verification data: {jsonString}")
            
            ' Store pending verification
            _pendingVerification = jsonString
            
            ' Process the verification
            ProcessVerification(jsonString)
        Catch ex As Exception
            Console.WriteLine($"Error in VerifyBio: {ex.Message}")
        End Try
    End Sub
    
    ' Process verification data
    Private Sub ProcessVerification(jsonString As String)
        Try
            Console.WriteLine($"Processing verification data...")
            
            ' Parse JSON using Newtonsoft.Json
            Dim jsonArray As JArray = JArray.Parse(jsonString)
            
            ' Extract first object in the array
            Dim jsonData As JObject = jsonArray(0)
            
            ' Extract templates and fingerprint
            Dim templates = jsonData("templates")("data")
            Dim fingerprint = jsonData("fingerprint")("message")
            
            Console.WriteLine($"Found {templates.Count} templates to compare against")
            
            ' Ensure biometric device is initialized
            If _biometric Is Nothing Then
                Console.WriteLine($"Initializing biometric device for verification")
                StartBiometric() ' Use StartBiometric instead of ResetBio to avoid loops
            End If
            
            If _biometric IsNot Nothing Then
                Console.WriteLine($"Starting template verification process")
                Dim result = VerifyByTemplates(fingerprint, templates)
                Console.WriteLine($"Verification process completed with result: {result}")
            Else
                Console.WriteLine($"Cannot verify - biometric device initialization failed")
                
                ' Send a failure result since we couldn't verify
                Dim failedResult As JObject = New JObject From {
                    {"employee_id", Nothing},
                    {"result", "failed"},
                    {"error", "Device initialization failed"}
                }
                
                SendVerificationResult(failedResult)
                
                ' Try to restart the biometric device
                RestartListening()
            End If
        Catch ex As Exception
            Console.WriteLine($"Error processing verification: {ex.Message}")
            Console.WriteLine($"Exception details: {ex.StackTrace}")
            
            ' Send a failure result for the error
            Try
                Dim failedResult As JObject = New JObject From {
                    {"employee_id", Nothing},
                    {"result", "failed"},
                    {"error", ex.Message}
                }
                
                SendVerificationResult(failedResult)
            Catch innerEx As Exception
                Console.WriteLine($"Error sending error result: {innerEx.Message}")
            End Try
            
            ' Make sure we return to listening state even after errors
            RestartListening()
        End Try
    End Sub

    Private Function VerifyByTemplates(fingerprint As String, templates As JArray) As String
        Console.WriteLine($"Processing verification against {templates.Count} templates")

        If _biometric Is Nothing Then
            Console.WriteLine($"ERROR: Biometric device not initialized")
            StartBiometric() ' Use StartBiometric instead of ResetBio to avoid loops
            If _biometric Is Nothing Then
                Console.WriteLine($"CRITICAL ERROR: Could not initialize biometric device")
                Return "failed-no-device"
            End If
        End If

        ' Validate fingerprint data
        If String.IsNullOrEmpty(fingerprint) Then
            Console.WriteLine($"ERROR: Empty fingerprint data provided")
            
            Dim errorResult As JObject = New JObject From {
                {"employee_id", Nothing},
                {"result", "failed"},
                {"error", "Empty fingerprint data"}
            }
            
            SendVerificationResult(errorResult)
            RestartListening()
            Return "failed-invalid-data"
        End If

        ' Check if we have any templates to compare against
        If templates Is Nothing OrElse templates.Count = 0 Then
            Console.WriteLine($"ERROR: No templates provided for comparison")
            
            Dim errorResult As JObject = New JObject From {
                {"employee_id", Nothing},
                {"result", "failed"},
                {"error", "No templates available for comparison"}
            }
            
            SendVerificationResult(errorResult)
            RestartListening()
            Return "failed-no-templates"
        End If

        Console.WriteLine($"Comparing fingerprint against {templates.Count} templates")
        Dim matchFound As Boolean = False

        ' Process each template
        For Each template In templates
            Try
                ' Extract data from template
                Dim employeeId = template("employee_id").ToString()
                Dim biometricData = template("biometric_data").ToString()

                ' Skip invalid templates
                If String.IsNullOrEmpty(biometricData) Then
                    Console.WriteLine($"Skipping template for employee ID {employeeId} - Invalid biometric data")
                    Continue For
                End If

                Console.WriteLine($"Comparing with employee ID: {employeeId}")
                Dim result = _biometric.CompareFingerPrint(fingerprint, biometricData)

                If result Then
                    Console.WriteLine($"Match found for employee ID: {employeeId}")
                    matchFound = True
                    
                    Dim successResult As JObject = New JObject From {
                        {"employee_id", employeeId},
                        {"employee", template},
                        {"result", "success"}
                    }

                    ' Emit verification result
                    SendVerificationResult(successResult)
                    Console.WriteLine($"Verification SUCCESSFUL for employee ID: {employeeId}")
                    
                    ' Reset the biometric device to listening state
                    RestartListening()
                    Return "success"
                End If
            Catch ex As Exception
                Console.WriteLine($"Error comparing template: {ex.Message}")
                ' Continue with next template
            End Try
        Next

        ' If we get here, no match was found
        Dim failedResult As JObject = New JObject From {
                  {"employee_id", Nothing},
                  {"result", "failed"},
                  {"error", "No matching fingerprint found"}
              }

        ' Emit failure result
        SendVerificationResult(failedResult)
        Console.WriteLine($"Verification FAILED - no matching templates found")
        
        ' Reset the biometric device to listening state
        RestartListening()
        Return "failed-no-match"
    End Function
    
    ' Method to restart listening without causing loops
    Private Sub RestartListening()
        Console.WriteLine($"Resetting biometric device to listening state")
        
        Try
            If _biometric IsNot Nothing Then
                ' Don't recreate the device, just reset it for listening
                _biometric.Start()
                Console.WriteLine($"Biometric device reset to listening state")
            Else
                ' If the device was closed or not initialized, we need to create a new one
                Console.WriteLine($"Creating new biometric device instance")
                StartBiometric()
            End If
        Catch ex As Exception
            Console.WriteLine($"Error restarting biometric listening: {ex.Message}")
            ' If we failed to restart, try to create a new instance
            Try
                If _biometric IsNot Nothing Then
                    _biometric.Close()
                End If
                StartBiometric()
            Catch innerEx As Exception
                Console.WriteLine($"Critical error restarting biometric device: {innerEx.Message}")
            End Try
        End Try
    End Sub
    
    ' Helper method to send verification result
    Private Sub SendVerificationResult(result As JObject)
        Try
            ' Send to socket
            If SOCKET IsNot Nothing AndAlso SOCKET.Connected Then
                SOCKET.EmitAsync("VERIFY_RESULT", result.ToString)
                Console.WriteLine($"Sent verification result")
            Else
                Console.WriteLine($"Cannot send verification result - socket not connected")
            End If
        Catch ex As Exception
            Console.WriteLine($"Error sending verification result: {ex.Message}")
        End Try
    End Sub

    Private Sub StopBio()
        Console.WriteLine($"Received STOP command")
        StopBiometric()
    End Sub
    
    ' Method to stop the biometric service
    Public Sub StopBiometric()
        If _biometric IsNot Nothing Then
            Console.WriteLine($"Stopping biometric device")
            _biometric.Close()
            _biometric = Nothing
        End If
        
        Console.WriteLine($"Biometric service stopped")
    End Sub

    Private Sub ResetBio()
        Console.WriteLine($"Received START command")
        
        ' Instead of just skipping when already initialized, reset the device to ensure it's ready
        If _biometric IsNot Nothing Then
            Console.WriteLine($"Resetting existing biometric device for new capture")
            Try
                ' Reset the device to start capturing again
                _biometric.Start()
            Catch ex As Exception
                Console.WriteLine($"Error resetting biometric: {ex.Message}")
                ' If reset fails, fully restart the biometric service
                StartBiometric()
            End Try
        Else
            Console.WriteLine($"Initializing new biometric device")
            StartBiometric()
        End If
    End Sub
    
    ' Method to start the biometric service
    Public Sub StartBiometric()
        Try
            If _biometric IsNot Nothing Then
                Console.WriteLine($"Closing existing biometric service")
                _biometric.Close()
                _biometric = Nothing
            End If

            Console.WriteLine($"Creating new biometric device instance")
            _biometric = New Biometric()

            Dim task As New Action(Of String)(AddressOf OnBio)
            Dim inializeTask As New Task(AddressOf AfterInitialize)
            Dim statusChangeTask As New Action(Of String)(AddressOf StatusChanged)

            _biometric.OnFingerPrint(task)
            _biometric.OnStatusChange(statusChangeTask)
            _biometric.Initialize(inializeTask)
            _biometric.Start()

            Console.WriteLine($"Biometric service started and listening...")
            
            ' Signal that the biometric is ready
            If SOCKET IsNot Nothing AndAlso SOCKET.Connected Then
                SOCKET.EmitAsync("BIOMETRIC_READY", "")
            End If
        Catch ex As Exception
            Console.WriteLine($"Error initializing biometric device: {ex.Message}")
            If _biometric IsNot Nothing Then
                Try
                    _biometric.Close()
                Catch innerEx As Exception
                    ' Ignore errors when closing
                End Try
                _biometric = Nothing
            End If
        End Try
    End Sub

    Private Sub StatusChanged(status)
        Console.WriteLine($"[Biometric Status] {status}")
        
        ' Send status update to connected client
        If SOCKET IsNot Nothing AndAlso SOCKET.Connected Then
            SOCKET.EmitAsync("STATUS", status)
        End If
    End Sub

    Private Sub AfterInitialize()
        Console.WriteLine($"Biometric device initialized")
        
        ' Send initialization notification
        If SOCKET IsNot Nothing AndAlso SOCKET.Connected Then
            SOCKET.EmitAsync("FINGERPRINT_INITIALIZED", "")
        End If
    End Sub

    Private Sub OnBio(result As String)
        Console.WriteLine($"Fingerprint captured!")
        
        ' Save the fingerprint data
        _fingerprintData = result
        
        ' Send fingerprint data to connected client
        If SOCKET IsNot Nothing AndAlso SOCKET.Connected Then
            SOCKET.EmitAsync("FINGERPRINT_CAPTURE", result)
            Console.WriteLine($"Fingerprint data sent to client")
            
            ' Reset the device for the next capture
            Console.WriteLine($"Preparing device for next capture")
            RestartListening()
        Else
            Console.WriteLine($"Cannot send fingerprint - socket not connected")
        End If
    End Sub

    ' Method to safely close the server and release resources
    Public Sub Close()
        Try
            Console.WriteLine($"Closing socket server...")
            
            ' Stop reconnect timer if it exists
            If ReconnectTimer IsNot Nothing Then
                ReconnectTimer.Dispose()
                ReconnectTimer = Nothing
            End If
            
            If SOCKET IsNot Nothing Then
                ' Disconnect from the server
                SOCKET.DisconnectAsync()
            End If

            If _biometric IsNot Nothing Then
                Console.WriteLine($"Closing biometric device...")
                _biometric.Close()
                _biometric = Nothing
            End If

            Console.WriteLine($"Socket server closed")
        Catch ex As Exception
            Console.WriteLine($"Error closing server: {ex.Message}")
        End Try
    End Sub

    ' Socket event handlers for additional events
    Private Sub PingHandler(response As SocketIOResponse)
        Console.WriteLine("Received PING from server")
        SOCKET.EmitAsync("PONG", "")
    End Sub
    
    Private Sub StatusCheckHandler(response As SocketIOResponse)
        Console.WriteLine("Received status check request")
        Dim status As String = "idle"
        If _biometric IsNot Nothing Then
            status = "ready"
        End If
        SOCKET.EmitAsync("DEVICE_STATUS", status)
    End Sub
End Class
