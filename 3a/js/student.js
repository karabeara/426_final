var Student = {
    // please fill in your name and NetID
    // your NetID is the part of your email before @princeton.edu
    'name'  : 'Kara Bressler and Khaled Tinubu',
    'netID' : 'karab and ktinubu',
};

Student.updateHTML = function( ) {
    var studentInfo = this.name + ' &lt;' + this.netID + '&gt;';
    document.getElementById('student').innerHTML = studentInfo;
}
