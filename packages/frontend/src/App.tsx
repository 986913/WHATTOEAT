import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [inputValue1, setInputValue1] = useState('');
  const [inputValue2, setInputValue2] = useState('');
  const [inputValue3, setInputValue3] = useState('');
  const [inputValue4, setInputValue4] = useState('');
  const [inputValue5, setInputValue5] = useState('');
  const [inputValue6, setInputValue6] = useState('');
  const [inputValue7, setInputValue7] = useState('');
  const [inputValue8, setInputValue8] = useState('');

  const [users, setUsers] = useState([]);
  const [userProfile, setUserProfile] = useState({});
  const [userLogs, setUserLogs] = useState([]);

  // 抽取为一个重用的获取函数
  async function fetchUsers() {
    try {
      const res = await fetch('/api/v1/user');
      if (!res.ok) throw new Error(`fetch users failed: ${res.status}`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching all users:', err);
    }
  }

  // 仅在组件挂载时加载一次；之后通过 fetchUsers() 手动刷新
  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className='App'>
      <div>
        <h1>今天吃什么？</h1>

        <h1>getUsers:</h1>
        {users.map((user: any) => {
          return (
            <p>
              id: {user?.id}, username: {user?.username}, password:
              {user?.password}
            </p>
          );
        })}

        <h1>getUserProfile:</h1>
        <input
          type='text'
          placeholder='输入用户ID, 获取用户Profile'
          id='userIdInput1'
          onChange={(e) => setInputValue1(e.target.value)}
        />
        <button
          onClick={() => {
            fetch(`/api/v1/user/profile?id=${inputValue1}`)
              .then((response) => response.json())
              .then((data) => setUserProfile(data))
              .catch((error) =>
                console.error('Error fetching user profile:', error)
              );
            setUserProfile({});
          }}
        >
          获取用户资料
        </button>
        <p>{userProfile && JSON.stringify(userProfile)}</p>

        <h1>getUserLogs:</h1>
        <input
          type='text'
          placeholder='输入用户ID, 获取用户所有Logs'
          id='userIdInput2'
          onChange={(e) => setInputValue2(e.target.value)}
        />
        <button
          onClick={() => {
            fetch(`/api/v1/user/logs?id=${inputValue2}`)
              .then((response) => response.json())
              .then((data) => setUserLogs(data))
              .catch((error) =>
                console.error('Error fetching user logs:', error)
              );
          }}
        >
          获取用户所有Logs
        </button>
        {userLogs.map((log: any) => {
          return (
            <p>
              id: {log?.id}, path: {log?.path}, method: {log?.method}, data:
              {log?.data}, result: {log?.result}, user:{' '}
              {JSON.stringify(log?.user)}
            </p>
          );
        })}

        <h1>addUser:</h1>
        <input
          type='text'
          placeholder='输入新用户名'
          id='newUsername'
          onChange={(e) => setInputValue3(e.target.value)}
        />
        <input
          type='password'
          placeholder='输入新用户密码'
          id='newUserpsd'
          onChange={(e) => setInputValue4(e.target.value)}
        />
        <button
          onClick={async () => {
            try {
              const res = await fetch(`/api/v1/user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  username: inputValue3,
                  password: inputValue4,
                }),
              });
              if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Create failed ${res.status}: ${txt}`);
              }
              const data = await res.json();
              alert('创建新用户成功: ' + JSON.stringify(data));
              await fetchUsers(); // 成功后刷新列表
            } catch (error) {
              console.error('Error create new user:', error);
            }
          }}
        >
          创建新用户!
        </button>

        <h1>deleteUser:</h1>
        <input
          type='text'
          placeholder='输入想删除的用户ID'
          id='userIdToDelete'
          onChange={(e) => setInputValue5(e.target.value)}
        />
        <button
          onClick={async () => {
            try {
              const res = await fetch(`/api/v1/user/${inputValue5}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
              });
              if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Delete failed ${res.status}: ${txt}`);
              }
              await res.json().catch(() => {}); // optional body
              alert('删除用户成功');
              await fetchUsers();
            } catch (error) {
              console.error(`Error delete user ${inputValue5}:`, error);
            }
          }}
        >
          删除!
        </button>

        <h1>updateUser:</h1>
        <input
          type='text'
          placeholder='输入你想更改的用户ID'
          id='userIdToUpdate'
          onChange={(e) => setInputValue6(e.target.value)}
        />
        <input
          type='text'
          placeholder='输入新用户名'
          id='updatedUserName'
          onChange={(e) => setInputValue7(e.target.value)}
        />
        <input
          type='password'
          placeholder='输入新密码'
          id='newUserpsd'
          onChange={(e) => setInputValue8(e.target.value)}
        />
        <button
          onClick={async () => {
            try {
              const res = await fetch(`/api/v1/user/${inputValue6}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  username: inputValue7,
                  password: inputValue8,
                }),
              });
              if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Update failed ${res.status}: ${txt}`);
              }
              await res.json();
              alert('更新用户成功');
              await fetchUsers();
            } catch (error) {
              console.error('Error update user:', error);
            }
          }}
        >
          更新用户
        </button>
      </div>
    </div>
  );
}

export default App;
