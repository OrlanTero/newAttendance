Imports System.Net.Sockets
Imports SocketIOClient
Imports Newtonsoft.Json
Imports Newtonsoft.Json.Linq
Imports System.Text.Json.Nodes
Imports System.Threading

' Convert from Module to Class to support multiple instances
Public Class SocketFingerprintServer
    Private SOCKET As SocketIOClient.SocketIO
    Private Shared _sharedBiometric As Biometric
    Private ServerInstanceName As String = "Default"
    Private Primary As Boolean = False
    Private ServerAddress As String = "127.0.0.1"
    Private ServerPort As Integer = 3005
    Private ReconnectTimer As Timer = Nothing
    Private Shared _primaryInstance As SocketFingerprintServer = Nothing
    Private Shared _secondaryInstance As SocketFingerprintServer = Nothing
    Private Shared _fingerprintData As String = ""
    Private Shared _biometricConnected As Boolean = False
    Private Shared _pendingVerification As Object = Nothing

    ' Static method to create and start server instances
    Public Shared Function Start(serverAddress As String, port As Integer, instanceName As String) As SocketFingerprintServer
        Dim server As New SocketFingerprintServer()
        ' First instance is primary and gets control of the biometric device
        server.Primary = (instanceName = "Server")
        
        ' Keep track of the instance
        If server.Primary Then
            _primaryInstance = server
        Else
            _secondaryInstance = server
        End If
        
        server.StartServer(serverAddress, port, instanceName)
        Return server
    End Function

    ' Instance method to start the server
    Private Sub StartServer(serverAddress As String, port As Integer, instanceName As String)
        ServerInstanceName = instanceName
        ServerAddress = serverAddress
        ServerPort = port
        
        Console.WriteLine($"[{ServerInstanceName}] Starting socket server connecting to {serverAddress}:{port}")

        ' Create socket connection with the provided server address and port
        SOCKET = New SocketIOClient.SocketIO($"http://{serverAddress}:{port}/")

        AddHandler SOCKET.OnConnected, Sub()
                                           Console.WriteLine($"[{ServerInstanceName}] Connected to Socket Server at {serverAddress}:{port}!")
                                           
                                           ' Stop any reconnect timer
                                           If ReconnectTimer IsNot Nothing Then
                                               ReconnectTimer.Dispose()
                                               ReconnectTimer = Nothing
                                           End If
                                           
                                           OnConnected()
                                           
                                           ' If there's a pending verification and we're the primary, process it
                                           If Primary AndAlso _pendingVerification IsNot Nothing Then
                                               Console.WriteLine($"[{ServerInstanceName}] Processing pending verification after reconnect")
                                               Try
                                                   Dim jsonString As String = _pendingVerification.ToString()
                                                   ProcessVerification(jsonString)
                                               Catch ex As Exception
                                                   Console.WriteLine($"[{ServerInstanceName}] Error processing pending verification: {ex.Message}")
                                               End Try
                                               _pendingVerification = Nothing
                                           End If
                                       End Sub

        AddHandler SOCKET.OnDisconnected, Sub()
                                              Console.WriteLine($"[{ServerInstanceName}] Disconnected from Socket Server!")
                                              OnDisconnected()
                                              
                                              ' Set up auto-reconnect
                                              If ReconnectTimer Is Nothing Then
                                                  Console.WriteLine($"[{ServerInstanceName}] Setting up reconnect timer...")
                                                  ReconnectTimer = New Timer(AddressOf TryReconnect, Nothing, 5000, 5000)
                                              End If
                                          End Sub

        StartBiometricService()

        SOCKET.ConnectAsync()
        Console.WriteLine($"[{ServerInstanceName}] Connection attempt initiated...")
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
        
        Console.WriteLine($"[{ServerInstanceName}] Attempting to reconnect to socket server...")
        Try
            SOCKET.ConnectAsync()
        Catch ex As Exception
            Console.WriteLine($"[{ServerInstanceName}] Reconnect error: {ex.Message}")
        End Try
    End Sub

    Private Sub OnConnected()
        _biometricConnected = True
        SOCKET.EmitAsync("BIOMETRIC_CONNECTED", "")
    End Sub

    Private Sub OnDisconnected()
        _biometricConnected = False
        SOCKET.EmitAsync("BIOMETRIC_DISCONNECTED", "")
    End Sub

    Private Sub StartBiometricService()
        Console.WriteLine($"[{ServerInstanceName}] Setting up biometric service event handlers")
        
        ' All instances listen for events
        SOCKET.On("START", AddressOf ResetBio)
        SOCKET.On("STOP", AddressOf StopBio)
        SOCKET.On("VERIFY_TEMPLATE", AddressOf VerifyBio)
        
        ' Only initialize biometric for the primary instance
        If Primary Then
            Console.WriteLine($"[{ServerInstanceName}] This is the primary instance - initializing biometric device")
            ' Initialize the biometric service
            ResetBio()
        Else
            Console.WriteLine($"[{ServerInstanceName}] This is a secondary instance - will relay events only")
        End If
    End Sub

    Private Sub VerifyBio(data As SocketIOResponse)
        Try
            ' Always log the verification request in both instances
            Console.WriteLine($"[{ServerInstanceName}] Received verification request")
            
            ' Save the raw data for debugging
            Dim jsonString As String = data.ToString()
            Console.WriteLine($"[{ServerInstanceName}] Verification data: {jsonString}")
            
            ' Store pending verification
            _pendingVerification = jsonString
            
            ' If this is the client (secondary) instance, forward the command to the server instance
            If Not Primary Then
                Console.WriteLine($"[{ServerInstanceName}] Forwarding verification request to server instance")
                
                ' Rather than using the socket to forward, directly call the method on the primary instance
                If _primaryInstance IsNot Nothing Then
                    ' Create a new thread to prevent blocking
                    Dim forwardThread As New Thread(Sub()
                                                        Try
                                                            _primaryInstance.ProcessVerificationFromSecondary(jsonString)
                                                        Catch ex As Exception
                                                            Console.WriteLine($"[{ServerInstanceName}] Error forwarding verification: {ex.Message}")
                                                        End Try
                                                    End Sub)
                    forwardThread.IsBackground = True
                    forwardThread.Start()
                Else
                    Console.WriteLine($"[{ServerInstanceName}] ERROR: Cannot forward to server - primary instance unavailable")
                End If
                Return
            End If

            ' Process the verification in the primary instance
            ProcessVerification(jsonString)

        Catch ex As Exception
            Console.WriteLine($"[{ServerInstanceName}] Error in VerifyBio: {ex.Message}")
        End Try
    End Sub
    
    ' Process verification received from secondary instance
    Public Sub ProcessVerificationFromSecondary(jsonString As String)
        If Not Primary Then
            Console.WriteLine($"[{ServerInstanceName}] ERROR: Non-primary instance cannot process verification")
            Return
        End If
        
        Console.WriteLine($"[{ServerInstanceName}] Processing verification forwarded from client instance")
        ProcessVerification(jsonString)
    End Sub
    
    ' Process verification data
    Private Sub ProcessVerification(jsonString As String)
        Try
            Console.WriteLine($"[{ServerInstanceName}] Processing verification data...")
            
            ' Parse JSON using Newtonsoft.Json
            Dim jsonArray As JArray = JArray.Parse(jsonString)
            
            ' Extract first object in the array
            Dim jsonData As JObject = jsonArray(0)
            
            ' Extract templates and fingerprint
            Dim templates = jsonData("templates")("data")
            Dim fingerprint = jsonData("fingerprint")("message")
            
            ' Ensure biometric device is initialized
            If _sharedBiometric Is Nothing Then
                Console.WriteLine($"[{ServerInstanceName}] Initializing biometric device for verification")
                StartBiometric() ' Use StartBiometric instead of ResetBio to avoid loops
            End If
            
            If _sharedBiometric IsNot Nothing Then
                VerifyByTemplates(fingerprint, templates)
                ' Note: RestartListening is called within VerifyByTemplates
            Else
                Console.WriteLine($"[{ServerInstanceName}] Cannot verify - biometric device initialization failed")
                
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
            Console.WriteLine($"[{ServerInstanceName}] Error processing verification: {ex.Message}")
            
            ' Send a failure result for the error
            Try
                Dim failedResult As JObject = New JObject From {
                    {"employee_id", Nothing},
                    {"result", "failed"},
                    {"error", ex.Message}
                }
                
                SendVerificationResult(failedResult)
            Catch innerEx As Exception
                Console.WriteLine($"[{ServerInstanceName}] Error sending error result: {innerEx.Message}")
            End Try
            
            ' Make sure we return to listening state even after errors
            RestartListening()
        End Try
    End Sub

    Private Sub VerifyByTemplates(fingerprint As String, templates As JArray)
        Console.WriteLine($"[{ServerInstanceName}] Processing verification against {templates.Count} templates")

        If _sharedBiometric Is Nothing Then
            Console.WriteLine($"[{ServerInstanceName}] ERROR: Biometric device not initialized")
            StartBiometric() ' Use StartBiometric instead of ResetBio to avoid loops
            If _sharedBiometric Is Nothing Then
                Console.WriteLine($"[{ServerInstanceName}] CRITICAL ERROR: Could not initialize biometric device")
                Return
            End If
        End If

        For Each template In templates
            Dim employeeId = template("employee_id").ToString()
            Dim biometricData = template("biometric_data").ToString()

            Console.WriteLine($"[{ServerInstanceName}] Comparing with employee ID: {employeeId}")
            Dim result = _sharedBiometric.CompareFingerPrint(fingerprint, biometricData)

            If result Then
                Dim successResult As JObject = New JObject From {
                    {"employee_id", employeeId},
                    {"employee", template},
                    {"result", "success"}
                }

                ' Emit verification result
                SendVerificationResult(successResult)
                Console.WriteLine($"[{ServerInstanceName}] Verification SUCCESSFUL for employee ID: {employeeId}")
                
                ' Reset the biometric device to listening state
                RestartListening()
                Return
            End If
        Next

        Dim failedResult As JObject = New JObject From {
                  {"employee_id", Nothing},
                  {"result", "failed"}
              }

        ' Emit failure result
        SendVerificationResult(failedResult)
        Console.WriteLine($"[{ServerInstanceName}] Verification FAILED - no matching templates found")
        
        ' Reset the biometric device to listening state
        RestartListening()
    End Sub
    
    ' Method to restart listening without causing loops
    Private Sub RestartListening()
        If Not Primary Then
            Console.WriteLine($"[{ServerInstanceName}] Secondary instance cannot restart biometric listening")
            Return
        End If
        
        Console.WriteLine($"[{ServerInstanceName}] Resetting biometric device to listening state")
        
        Try
            If _sharedBiometric IsNot Nothing Then
                ' Don't recreate the device, just reset it for listening
                _sharedBiometric.Start()
                Console.WriteLine($"[{ServerInstanceName}] Biometric device reset to listening state")
            Else
                ' If the device was closed or not initialized, we need to create a new one
                Console.WriteLine($"[{ServerInstanceName}] Creating new biometric device instance")
                StartBiometric()
            End If
        Catch ex As Exception
            Console.WriteLine($"[{ServerInstanceName}] Error restarting biometric listening: {ex.Message}")
            ' If we failed to restart, try to create a new instance
            Try
                If _sharedBiometric IsNot Nothing Then
                    _sharedBiometric.Close()
                End If
                StartBiometric()
            Catch innerEx As Exception
                Console.WriteLine($"[{ServerInstanceName}] Critical error restarting biometric device: {innerEx.Message}")
            End Try
        End Try
    End Sub
    
    ' Helper method to send verification result to both instances
    Private Sub SendVerificationResult(result As JObject)
        Try
            ' Send to this instance's socket
            If SOCKET IsNot Nothing AndAlso SOCKET.Connected Then
                SOCKET.EmitAsync("VERIFY_RESULT", result.ToString)
                Console.WriteLine($"[{ServerInstanceName}] Sent verification result to own socket")
            Else
                Console.WriteLine($"[{ServerInstanceName}] Cannot send verification result - socket not connected")
            End If
            
            ' Send to the other instance
            If Primary AndAlso _secondaryInstance IsNot Nothing Then
                _secondaryInstance.RelayVerificationResult(result)
            ElseIf Not Primary AndAlso _primaryInstance IsNot Nothing Then
                _primaryInstance.RelayVerificationResult(result)
            End If
        Catch ex As Exception
            Console.WriteLine($"[{ServerInstanceName}] Error sending verification result: {ex.Message}")
        End Try
    End Sub
    
    ' Helper method to relay verification result
    Public Sub RelayVerificationResult(result As JObject)
        Try
            If SOCKET IsNot Nothing AndAlso SOCKET.Connected Then
                SOCKET.EmitAsync("VERIFY_RESULT", result.ToString)
                Console.WriteLine($"[{ServerInstanceName}] Relayed verification result")
            Else
                Console.WriteLine($"[{ServerInstanceName}] Cannot relay verification result - socket not connected")
            End If
        Catch ex As Exception
            Console.WriteLine($"[{ServerInstanceName}] Error relaying verification result: {ex.Message}")
        End Try
    End Sub

    Private Sub StopBio()
        Console.WriteLine($"[{ServerInstanceName}] Received STOP command")
        
        ' Only the primary instance should control the biometric device
        If Not Primary Then
            Console.WriteLine($"[{ServerInstanceName}] Forwarding STOP command to server instance")
            
            ' Use direct method call instead of socket forwarding
            If _primaryInstance IsNot Nothing Then
                _primaryInstance.StopBiometric()
            Else
                Console.WriteLine($"[{ServerInstanceName}] ERROR: Cannot forward to server - primary instance unavailable")
            End If
            Return
        End If

        StopBiometric()
    End Sub
    
    ' Method that can be called directly to stop the biometric service
    Public Sub StopBiometric()
        If Not Primary Then
            Console.WriteLine($"[{ServerInstanceName}] ERROR: Non-primary instance cannot stop biometric device")
            Return
        End If
        
        If _sharedBiometric IsNot Nothing Then
            Console.WriteLine($"[{ServerInstanceName}] Stopping biometric device")
            _sharedBiometric.Close()
            _sharedBiometric = Nothing
        End If
        
        Console.WriteLine($"[{ServerInstanceName}] Biometric service stopped")
    End Sub

    Private Sub ResetBio()
        Console.WriteLine($"[{ServerInstanceName}] Received START command")
        
        ' Only the primary instance should control the biometric device
        If Not Primary Then
            Console.WriteLine($"[{ServerInstanceName}] Forwarding START command to server instance")
            
            ' Use direct method call instead of socket forwarding
            If _primaryInstance IsNot Nothing Then
                _primaryInstance.StartBiometric()
            Else
                Console.WriteLine($"[{ServerInstanceName}] ERROR: Cannot forward to server - primary instance unavailable")
            End If
            Return
        End If

        ' Just call StartBiometric directly, don't make it recursive
        If _sharedBiometric Is Nothing Then
            StartBiometric()
        Else
            Console.WriteLine($"[{ServerInstanceName}] Biometric already initialized, skipping")
        End If
    End Sub
    
    ' Method that can be called directly to start the biometric service
    Public Sub StartBiometric()
        If Not Primary Then
            Console.WriteLine($"[{ServerInstanceName}] ERROR: Non-primary instance cannot start biometric device")
            Return
        End If
        
        Try
            If _sharedBiometric IsNot Nothing Then
                Console.WriteLine($"[{ServerInstanceName}] Closing existing biometric service")
                _sharedBiometric.Close()
                _sharedBiometric = Nothing
            End If

            Console.WriteLine($"[{ServerInstanceName}] Creating new biometric device instance")
            _sharedBiometric = New Biometric()

            Dim task As New Action(Of String)(AddressOf OnBio)
            Dim inializeTask As New Task(AddressOf AfterInitialize)
            Dim statusChangeTask As New Action(Of String)(AddressOf StatusChanged)

            _sharedBiometric.OnFingerPrint(task)
            _sharedBiometric.OnStatusChange(statusChangeTask)
            _sharedBiometric.Initialize(inializeTask)
            _sharedBiometric.Start()

            Console.WriteLine($"[{ServerInstanceName}] Biometric service started and listening...")
        Catch ex As Exception
            Console.WriteLine($"[{ServerInstanceName}] Error initializing biometric device: {ex.Message}")
            If _sharedBiometric IsNot Nothing Then
                Try
                    _sharedBiometric.Close()
                Catch innerEx As Exception
                    ' Ignore errors when closing
                End Try
                _sharedBiometric = Nothing
            End If
        End Try
    End Sub

    Private Sub StatusChanged(status)
        Console.WriteLine($"[{ServerInstanceName}] [Biometric Status] {status}")
        
        ' Send status update to connected client
        If SOCKET IsNot Nothing AndAlso SOCKET.Connected Then
            SOCKET.EmitAsync("STATUS", status)
        End If
        
        ' If this is the primary instance, also relay status to secondary instance
        If Primary AndAlso _secondaryInstance IsNot Nothing Then
            _secondaryInstance.RelayStatus(status)
        End If
    End Sub
    
    ' Helper method to relay status updates
    Public Sub RelayStatus(status As String)
        If SOCKET IsNot Nothing AndAlso SOCKET.Connected Then
            SOCKET.EmitAsync("STATUS", status)
        End If
    End Sub

    Private Sub AfterInitialize()
        Console.WriteLine($"[{ServerInstanceName}] Biometric device initialized")
        
        ' Send initialization notification
        If SOCKET IsNot Nothing AndAlso SOCKET.Connected Then
            SOCKET.EmitAsync("FINGERPRINT_INITIALIZED", "")
        End If
        
        ' If this is the primary instance, also relay to secondary instance
        If Primary AndAlso _secondaryInstance IsNot Nothing Then
            _secondaryInstance.RelayInitialized()
        End If
    End Sub
    
    ' Helper method to relay initialization
    Public Sub RelayInitialized()
        If SOCKET IsNot Nothing AndAlso SOCKET.Connected Then
            SOCKET.EmitAsync("FINGERPRINT_INITIALIZED", "")
        End If
    End Sub

    Private Sub OnBio(result As String)
        Console.WriteLine($"[{ServerInstanceName}] Fingerprint captured!")
        
        ' Save the fingerprint data
        _fingerprintData = result
        
        ' Send fingerprint data to connected client
        If SOCKET IsNot Nothing AndAlso SOCKET.Connected Then
            SOCKET.EmitAsync("FINGERPRINT_CAPTURE", result)
        End If
        
        ' If this is the primary instance, also relay to secondary instance
        If Primary AndAlso _secondaryInstance IsNot Nothing Then
            _secondaryInstance.RelayFingerprint(result)
        End If
        
        Console.WriteLine($"[{ServerInstanceName}] Fingerprint data sent")
    End Sub
    
    ' Helper method to relay fingerprint data
    Public Sub RelayFingerprint(result As String)
        If SOCKET IsNot Nothing AndAlso SOCKET.Connected Then
            SOCKET.EmitAsync("FINGERPRINT_CAPTURE", result)
        End If
    End Sub

    ' Method to safely close the server and release resources
    Public Sub Close()
        Try
            Console.WriteLine($"[{ServerInstanceName}] Closing socket server...")
            
            ' Stop reconnect timer if it exists
            If ReconnectTimer IsNot Nothing Then
                ReconnectTimer.Dispose()
                ReconnectTimer = Nothing
            End If
            
            If SOCKET IsNot Nothing Then
                ' Disconnect from the server
                SOCKET.DisconnectAsync()
            End If

            ' Only the primary instance closes the biometric device
            If Primary AndAlso _sharedBiometric IsNot Nothing Then
                Console.WriteLine($"[{ServerInstanceName}] Closing biometric device...")
                _sharedBiometric.Close()
                _sharedBiometric = Nothing
            End If

            Console.WriteLine($"[{ServerInstanceName}] Socket server closed")
            
            ' Clear references
            If Primary Then
                _primaryInstance = Nothing
            Else
                _secondaryInstance = Nothing
            End If
            
        Catch ex As Exception
            Console.WriteLine($"[{ServerInstanceName}] Error closing server: {ex.Message}")
        End Try
    End Sub
End Class
