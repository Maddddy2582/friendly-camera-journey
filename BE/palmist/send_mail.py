import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import time

file_path = 'D:/friendly-camera-journey/BE/palmist/data.json'
event_type = 'palmist'

smtp_server = "smtp.office365.com"
smtp_port = 587
smtp_user = "ashritha.shankar@solitontech.com"
smtp_password = "xdfbsrgnvjjckjhd"
sender_email = "ashritha.shankar@solitontech.com"
receiver_email = "ashritha.shankar@solitontech.com"



def send_mail_to_user():
    print('maill')
    """Send an email notification."""
    subject = f"File System Event: {event_type}"
    body = f"Event Type: {event_type}\nFile Path: {file_path}\nTimestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}"
    msg = MIMEMultipart()
    msg["From"] = sender_email
    msg["To"] = receiver_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))
    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            text = msg.as_string()
            server.sendmail(sender_email, receiver_email, text)
        print(f"Email sent: {subject}")
    except Exception as e:
        print(f"Failed to send email: {e}")