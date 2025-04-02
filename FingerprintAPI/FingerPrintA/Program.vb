Module Program
    ' Reference to server instances to keep them from being garbage collected
    Private serverInstance1 As SocketFingerprintServer
    Private serverInstance2 As SocketFingerprintServer

    Sub Main()
        Try
            ' Ask for server API address
            Console.WriteLine("Enter the server API address (e.g. 192.168.1.19):")
            Dim serverApiAddress As String = Console.ReadLine()

            If String.IsNullOrEmpty(serverApiAddress) Then
                serverApiAddress = "127.0.0.1" ' Default to localhost if nothing entered
                Console.WriteLine($"Using default address: {serverApiAddress}")
            End If

            Console.WriteLine($"Using server API address: {serverApiAddress}")
            Console.WriteLine("Starting fingerprint service...")

            ' First server for main Electron app (server) - Port 3005
            ' This is the primary instance that controls the biometric device
            Dim thread1 As New Threading.Thread(Sub()
                                                    serverInstance1 = SocketFingerprintServer.Start(serverApiAddress, 3005, "Server")
                                                End Sub)
            thread1.IsBackground = True
            thread1.Start()

            ' Wait for the first server to initialize
            Threading.Thread.Sleep(2000)

            ' Second server for client Electron app - Port 3006
            ' This is a secondary instance that just relays events
            Dim thread2 As New Threading.Thread(Sub()
                                                    serverInstance2 = SocketFingerprintServer.Start(serverApiAddress, 3006, "Client")
                                                End Sub)
            thread2.IsBackground = True
            thread2.Start()

            Console.WriteLine()
            Console.WriteLine("==============================================")
            Console.WriteLine("Fingerprint service is now running on ports 3005 and 3006")
            Console.WriteLine("Server instance handling biometric device")
            Console.WriteLine("Client instance relaying events")
            Console.WriteLine("==============================================")
            Console.WriteLine()
            Console.WriteLine("Press any key to exit...")
            Console.ReadKey()
        Finally
            ' Clean up resources when exiting
            If serverInstance1 IsNot Nothing Then
                serverInstance1.Close()
            End If

            If serverInstance2 IsNot Nothing Then
                serverInstance2.Close()
            End If

            Console.WriteLine("Fingerprint servers closed.")
        End Try
    End Sub
End Module
