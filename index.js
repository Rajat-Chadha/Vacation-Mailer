const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const {OAuth2Client} = require('google-auth-library');
const gmail = google.gmail('v1');

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json'); // Credentials are stored in the credentials.json file, which was downloaded from Google Cloud Console.


/* Authorize function, saveCredentials and loadSavedCredentialsIfExist functions are responsible for handeling the Google Sign In.
The Authorize function is firstly called in the main function, which then checks if there are any saved creadentials in the form
of Token.json file present in the directory. If it returns false then the Autorize function Performs google Sign In Authentication.
The the Authorize function runs the saveCredentials Function which save the credentials in Token.json file.
In the Main function the Authorize function returns a constant Auth Object, which is stored in the OAuth2 constant.
*/

async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
      return client;
    }
    client = await authenticate({
      scopes: SCOPES,
      keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
      await saveCredentials(client);
    }
    return client;
  }

/*
    The listMessages function returns the message Object of the Emails under the lable : "unread and indox", also it selects only those emails which are delivered in last 24 Hours.The message Object contains the unique message id and the thread id.
*/
function listMessages(auth) {
    return new Promise((resolve, reject) => {
      const gmail = google.gmail({version: 'v1', auth});
      gmail.users.messages.list(
        {
          userId: 'me',
          q: 'label:unread label:inbox newer_than:1d',
        },
        (err, res) => {
          if (err)
          {
            reject(err);
            return;
          }
          if (!res.data.messages)
          {
            resolve([]);
            return;
          }
          resolve(res.data.messages);
        }
      );
    });}

/*
    The headerData function returns and array containing the header objects of the unique message ids passed as an argument to it.
*/
function headerData(auth,messageID) {
    return new Promise((resolve, reject) => {
      const gmail = google.gmail({version: 'v1', auth});
      gmail.users.messages.get(
        {
            userId: "me",
            id: messageID,
        },
        (err, res) => {
          if (err)
          {
            reject(err);
            return;
          }
          if (!res.data.payload.headers)
          {
            resolve([]);
            return;
          }
          resolve(res.data.payload.headers);
        }
      );
    });
}

/*
    The previousThreads function returns the resultSizeEstimate which is the count of past threads, belonging to the same
    email Ids passed to it as an argument.
*/
function previousThreads(auth,emailId) {
    return new Promise((resolve, reject) => {
      const gmail = google.gmail({version: 'v1', auth});
      gmail.users.threads.list(
        {
            userId: "me",
            q: `from: ${emailId}`,
        },
        (err, res) => {
          if (err)
          {
            reject(err);
            return;
          }
          if (!res)
          {
            resolve([]);
            return;
          }
          resolve(res.data.resultSizeEstimate);
        }
      );
    });
}

/* sendGmail Function sends the automated mail in the base64 format */
function sendGmail(auth, Email) {
    const makeBody = params => {
      params.subject = new Buffer.from(params.subject).toString("base64");
      const str = [
        'Content-Type: text/plain; charset="UTF-8"\n',
        "MINE-Version: 1.0\n",
        "Content-Transfer-Encoding: 7bit\n",
        `to: ${params.to} \n`,
        `from: ${params.from} \n`,
        `subject: =?UTF-8?B?${params.subject}?= \n\n`,
        params.message
      ].join("");
      return new Buffer.from(str)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
    };
    const messageBody = `Hi There,
I am currently on Leave Today.
Will get Back to you Soon !!!`;
    const raw = makeBody({
      to: Email,
      from: "rchadha2001.4rc@gmail.com",
      subject: "On Leave",
      message: messageBody
    });

    const gmail = google.gmail({ version: "v1", auth: auth });
    gmail.users.messages.send(
      {
        userId: "me",
        resource: {
          raw: raw
        }
      },
      (err, res) => {
        if (err) {
          console.log(err);
          return;
        }});return true;}

/*
    The changeLabel function changes the Label of Emails received from "Unread" to "Vacation Mailer"
*/
  function changeLabel(auth, emailId) {
    return new Promise((resolve, reject) => {
      const gmail = google.gmail({version: 'v1', auth});
      gmail.users.messages.modify(
        {
          userId: 'me',
          id: emailId,
          addLabelIds: ['Label_1'],
          removeLabelIds: ['UNREAD']
        },
        (err, res) => {
          if (err)
          {
            reject(err);
            return;
          }
          if (!res)
          {
            resolve([]);
            return;
          }
          resolve(res);
        }
      );
    });
}

/*
    The Programs starts from here !!
*/
async function main() {
    const OAuth2 = await authorize(); // Stores Authentication Object.
    const messageList = await listMessages(OAuth2); //Stores the Message object containing Message Ids and Thread Ids.
    const messageIDs = [];
    messageList.forEach((message) => { //Stores the Message Ids in the messageIDs array declared in the previous line.
        messageIDs.push(message.id);
    })
    const headerDataList = [];
    let idEmailMap = new Map();
    for(const id of messageIDs) //Stores the header data of the message Ids presents in the MessageID array in the headerDataList array. Also Stores the Message Ids as key and headerData as value in the Hashmap idEmailMap
    {
        let headData = await headerData(OAuth2, id);
        idEmailMap.set(id,headData);
        headerDataList.push(headData);
    }
    for(const value of idEmailMap) //Extracts the email ids from the header data present in the hashmap and overwrites the email as value over the header data for all the messageIds present as key in the Hashmap idEmailMap. Also removes duplicate!!
    {
        for(const head of value[1])
        {
            if(head.name === 'From')
            {
                const valHead = head.value.split(" ");
                let ID = valHead[valHead.length -1];
                ID = ID.substring(1,ID.length-1);

                idEmailMap.set(value[0],ID);
            }
        }
    }
    const idEmail = new Map();
    for(const val of idEmailMap) // Swaps the key and value & stores it in the Hashmap idEmail declared in the previous line.
    {
        idEmail.set(val[1],val[0]);
    }
    const EmailIds = [];
    for(const header of headerDataList) //Extracts the Email Ids from the headerDataList array and Stores it in the EmailIds array declared in the previous line !!
    {
        for(const head of header)
        {
            if(head.name === 'From')
            {
                const valHead = head.value.split(" ");
                let ID = valHead[valHead.length -1];
                ID = ID.substring(1,ID.length-1);
                EmailIds.push(ID);
            }
        }
    }
    const eligibleId = [];
    let eligibleEmailIds = [];
    for(const email of EmailIds) //Stores the eligible emails in the eligibleEmailIds array and the message Idsof these eligible emails in the eligibleId array. That means only those emails are aloud which don't have any previous thread.
    {
        let eligibleEmailResponse = await previousThreads(OAuth2, email);
        if(eligibleEmailResponse === 1)
        {
            eligibleEmailIds.push(email);
            eligibleId.push(idEmail.get(email));
        }

    }
    eligibleEmailIds =  eligibleEmailIds.filter((item,index) => eligibleEmailIds.indexOf(item) === index); // Removes Duplicate Email Ids from the eligibleEmailIds array.
    for(const email of eligibleEmailIds) // Sends the Automated Email on the eligible Email Ids.
    {
        const SendAutomatedReply = sendGmail(OAuth2, email);
        console.log(email);
        if(SendAutomatedReply == true)
        {
            console.log(`Automated Email Sent Successfully to ${email}`);
        }
    }
    for(const id of eligibleId) // Changes the Label of emails which have been replied to from 'Unread' to 'Vacation Mailer'.
    {
        const labelChange = await changeLabel(OAuth2,id);
        console.log(`Label Changed for Id -> ${id}`);
    }
}

setInterval(main, 50000); //Automatically initialises the Main function after every 50 Seconds. Untill press Ctrl+C on the command line or terminal.
