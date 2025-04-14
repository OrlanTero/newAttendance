Module Program
    ' Reference to server instance to keep it from being garbage collected
    Private serverInstance As SocketFingerprintServer

    Sub Main()
        Dim args = Environment.GetCommandLineArgs()
        If args.Length > 1 Then
            Dim serverApiAddress As String = args(1)
            Dim port As Integer = args(2)
            ' Use the IP address directly in your API logic
            'Console.WriteLine("IP address provided: " + ipAddress)

            serverInstance = SocketFingerprintServer.Start(serverApiAddress, port)
        Else
            ' Optional fallback IP or error handling

            Console.WriteLine("No IP address provided. Using default IP: 127.0.0.1")

            ' Start the server with a default IP address
            serverInstance = SocketFingerprintServer.Start("localhost", 3005)
        End If

        Try
            Console.WriteLine("========================================================")
            Console.WriteLine("Fingerprint Service - Single Instance Mode")
            Console.WriteLine("========================================================")

            ' Ask for server API address
            Console.WriteLine("Enter the server API address (e.g. 192.168.1.19):")
            Dim serverApiAddress As String = Console.ReadLine()

            If String.IsNullOrEmpty(serverApiAddress) Then
                serverApiAddress = "127.0.0.1" ' Default to localhost if nothing entered
                Console.WriteLine($"Using default address: {serverApiAddress}")
            End If

            Console.WriteLine($"Using server API address: {serverApiAddress}")
            Console.WriteLine("Starting fingerprint service...")

            ' Single server instance on port 3005
            serverInstance = SocketFingerprintServer.Start(serverApiAddress, 3005)

            ' Add a short delay to allow initialization to complete
            Console.WriteLine("Waiting for initialization to complete...")
            Threading.Thread.Sleep(2000)

            Console.WriteLine()
            Console.WriteLine("==============================================")
            Console.WriteLine("Fingerprint service is now running on port 3005")
            Console.WriteLine("==============================================")
            Console.WriteLine()
            Console.WriteLine("Service is ready to process fingerprints")
            Console.WriteLine("Press any key to exit...")
            Console.ReadKey()
        Catch ex As Exception
            Console.WriteLine($"Critical error: {ex.Message}")
            Console.WriteLine(ex.StackTrace)
            Console.WriteLine("Press any key to exit...")
            Console.ReadKey()
        Finally
            ' Clean up resources when exiting
            Console.WriteLine("Shutting down fingerprint service...")
            If serverInstance IsNot Nothing Then
                serverInstance.Close()
            End If

            Console.WriteLine("Fingerprint server closed.")
        End Try
    End Sub
End Module
