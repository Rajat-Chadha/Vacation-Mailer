# Vacation-Mailer

Vacation Mailer is a Node.js based app that is able to respond to emails sent to your Gmail mailbox while you’re out on a vacation.

What the app does:
1. The app checks for new emails in a given Gmail ID
  
    Immplemented the “Login with google” API for this
    
2. The app send replies to Emails that have no prior replies
   
    The app identifies and isolate the email threads in which no prior email has been sent by you. It only replies to first time email threads sent by others to your    
    mailbox.
    
3. The app adds a Label to the email and move the emails to the label
    
    After sending the replies, the email is tagged with a label "Vacation Mailer" in Gmail.
    
4. The app repeats this sequence of steps 1-3 in random intervals of 45 to 120 seconds.


Pre Requisites you need :
Should have a project on Google Cloud Developers Website, from where you would download the credentials.json files. 
Should have googleApi, fs, path, process module installed in your system.

To Run the Project :
In the terminal run commad -> node index.js
